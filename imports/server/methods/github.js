import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { appOctokit } from '/imports/server/octokit/lib.js';
import { profiles as profilesCollection } from '/imports/lib/collections/profiles.collection.js';
import { jobs as jobsCollection } from '/imports/lib/collections/jobs.collection.js';

import { app } from '/server/main.js';

const freeFormFields = ['title', 'description'];

Meteor.methods({
  async 'github.issue.profile'(type, form) {
    check(type, Match.OneOf('candidate', 'company'));
    check(form, Object);

    const user = app.checkUser(this.userId);

    const formData = {
      type,
      title: form.title,
      isUpdate: form.isUpdate || false,
      ...app.parseForm(form, freeFormFields)
    };

    formData.tags.push(type);

    const profile = profilesCollection.findOne({
      'user.login': user.services.github.username
    }, {
      fields: {
        _id: 1,
        tags: 1,
        'issue.number': 1
      }
    });

    if (profile) {
      formData._id = profile._id;
      formData.existingTags = profile.tags;
    }

    if (!profile || !profile?.issue?.number) {
      try {
        const issues = await appOctokit.rest.search.issuesAndPullRequests({
          q: `is:issue author:${user.services.github.username} repo:${Meteor.settings.public.repo.org}/${Meteor.settings.public.repo.profiles}`,
          sort: 'created',
          order: 'asc',
          per_page: 1,
          page: 1
        });

        if (issues.data?.items?.[0]) {
          formData.issue = {
            number: issues.data.items.[0].number
          };

          if (!formData.existingTags) {
            formData.existingTags = [];
          }

          for (const label of issues.data.items[0].labels) {
            formData.existingTags.push(label.name);
          }

          formData.existingTags = app.uniq(formData.existingTags);
        }
      } catch (e) {
        console.error('[github.issue.profile] [appOctokit.rest.search.issuesAndPullRequests] Error:', e);
        throw new Meteor.Error(e.status || 500, '[github.issue.profile] [appOctokit.rest.search.issuesAndPullRequests] Server error occurred. Please, try again later');
      }
    } else {
      formData.issue = {
        number: profile.issue.number
      };
    }

    if (type === 'company') {
      if (formData.username) {
        try {
          const companies = await appOctokit.rest.search.users({
            q: `org:${formData.username} type:users`,
            per_page: 1,
            page: 1
          });

          if (companies.data?.items?.[0]) {
            formData.company = {
              id: companies.data?.items?.[0].id,
              login: companies.data?.items?.[0].login
            };
          } else {
            return {
              errorFields: {
                username: 'Organization not found on GitHub'
              }
            };
          }
        } catch (e) {
          console.error('[github.issue.profile] [appOctokit.rest.search.users] Error:', e);
        }
      }

      formData.tags.push(`company:${app.slugify(formData.title)}`);
    } else {
      if (form.remote === 'yes') {
        formData.tags.push('remote');
        formData.isRemote = true;
      } else {
        formData.isRemote = false;
      }

      formData.location = {
        country: form.country,
        city: form.city
      };

      let location;
      if (form.country && form.city) {
        location = `${app.slugify(form.country.trim())}:${app.slugify(form.city.trim())}`;
      } else if (form.country && !form.city) {
        location = app.slugify(form.country.trim());
      } else if (!form.country && form.city) {
        return {
          errorFields: {
            country: 'Country is required when City is filled-out'
          }
        };
      }

      if (location) {
        formData.tags.push(location);
        formData.locationText = `\`${location}\``;
      } else {
        formData.locationText = '`not specified`';
      }
    }

    formData.tags = app.uniq(formData.tags);

    await app.profiles.upsert(user, formData);
    return true;
  },
  async 'github.issue.profile.close'() {
    const user = app.checkUser(this.userId);
    await app.profiles.close(user);
    return true;
  },
  async 'github.issue.profile.reopen'() {
    const user = app.checkUser(this.userId);
    await app.profiles.reopen(user);
    return true;
  },
  async 'github.issue.job.close'(number) {
    check(number, Number);

    const user = app.checkUser(this.userId);
    if (!user.profile.jobs?.includes(number)) {
      throw new Meteor.Error(403, 'Account does not own this issue');
    }

    await app.jobs.close(user, number);
    return true;
  },
  async 'github.issue.job.apply'(form) {
    check(form, Object);
    check(form.number, Number);
    check(form.body, String);

    const user = app.checkUser(this.userId);
    if (user.profile.applied?.includes(form.number)) {
      throw new Meteor.Error(400, 'You already applied to this position');
    }

    await app.jobs.apply(user, form);
    return true;
  },
  async 'github.issue.job.open'(number) {
    check(number, Number);

    const user = app.checkUser(this.userId);
    if (!user.profile.jobs.includes(number)) {
      throw new Meteor.Error(403, 'Account does not own this issue');
    }

    await app.jobs.reopen(user, number);
    return true;
  },
  async 'github.issue.job'(form) {
    check(form, Object);

    const user = app.checkUser(this.userId);
    const profile = profilesCollection.findOne({
      owner: user._id
    }, {
      fields: {
        title: 1,
        company: 1,
        type: 1
      }
    });

    if (!profile || !profile.title || profile.type !== 'company') {
      throw new Meteor.Error(400, 'Job post creation available only to company\'s accounts');
    }

    const formData = {
      profile,
      title: form.title,
      isUpdate: form.isUpdate || false,
      ...app.parseForm(form, freeFormFields)
    };

    formData.tags.push(`company:${app.slugify(profile.title)}`);

    if (!formData.budget) {
      formData.budget = {};
    }

    if (form.budgetType) {
      formData.budget.type = form.budgetType;
    }

    if (form.budgetValue) {
      formData.budget.value = parseInt(form.budgetValue);
    }

    if (form.budgetCurrency) {
      formData.budget.currency = form.budgetCurrency;
    }


    let job = false;

    if (formData.isUpdate && form._id) {
      job = jobsCollection.findOne({
        _id: form._id,
        owner: this.userId
      }, {
        fields: {
          _id: 1,
          tags: 1,
          issue: 1
        }
      });

      if (!job) {
        throw new Meteor.Error(403, 'You don\'t own this job post!');
      }

      formData._id = job._id;
      formData.existingTags = job.tags;
      formData.issue = {
        number: job.issue.number
      };
    }

    if (form.remote === 'yes') {
      formData.tags.push('remote');
      formData.isRemote = true;
    } else {
      formData.isRemote = false;
    }

    formData.location = {
      country: form.country,
      city: form.city
    };

    let location;
    if (form.country && form.city) {
      location = `${app.slugify(form.country.trim())}:${app.slugify(form.city.trim())}`;
    } else if (form.country && !form.city) {
      location = app.slugify(form.country.trim());
    } else if (!form.country && form.city) {
      return {
        errorFields: {
          country: 'Country is required when City is filled-out'
        }
      };
    }

    if (location) {
      formData.tags.push(location);
      formData.locationText = `\`${location}\``;
    } else {
      formData.locationText = '`not specified`';
    }

    formData.tags = app.uniq(formData.tags);

    const number = await app.jobs.upsert(user, formData);
    return number;
  }
});

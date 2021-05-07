import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { render, whileWaiting, templates } from './helpers.js';

FlowRouter.route('/', {
  isPublic: true,
  name: 'index',
  action() {
    render(this, templates.layout, 'index');
  },
  waitOn() {
    return import('/imports/client/index/index.js');
  },
  whileWaiting
});

FlowRouter.route('/login', {
  isPublic: true,
  name: 'login',
  title: 'Login to NEAR Protocol Job Board',
  action() {
    render(this, templates.layout, 'login');
  },
  waitOn() {
    return import('/imports/client/login/login.js');
  },
  whileWaiting
});

FlowRouter.route('/signup', {
  isPublic: false,
  name: 'signup',
  title: 'Signup to NEAR Protocol Job Board',
  action() {
    render(this, templates.layout, 'signup');
  },
  waitOn() {
    return import('/imports/client/signup/signup.js');
  },
  whileWaiting
});

FlowRouter.route('/job/new', {
  isPublic: false,
  name: 'newjob',
  title: 'Create new job post',
  action() {
    render(this, templates.layout, 'newjob');
  },
  waitOn() {
    return import('/imports/client/newjob/newjob.js');
  },
  whileWaiting
});

FlowRouter.route('/job/:number', {
  isPublic: true,
  name: 'job',
  title: 'View a job post',
  action(params) {
    render(this, templates.layout, 'job', params);
  },
  waitOn(params) {
    return [
      import('/imports/client/job/job.js'),
      Meteor.subscribe('job', params.number)
    ];
  },
  whileWaiting
});

FlowRouter.route('/job/:number/edit', {
  isPublic: false,
  name: 'editjob',
  title: 'Edit a job post',
  action(params) {
    render(this, templates.layout, 'job', params);
  },
  waitOn(params) {
    return [
      import('/imports/client/job/edit.js'),
      Meteor.subscribe('job', params.number)
    ];
  },
  whileWaiting
});

FlowRouter.route('/profile/settings', {
  isPublic: false,
  name: 'profileSettings',
  title: 'Profile settings',
  action() {
    render(this, templates.layout, 'profileSettings');
  },
  waitOn() {
    return [
      import('/imports/client/profile/settings.js'),
      Meteor.subscribe('profile')
    ];
  },
  whileWaiting
});

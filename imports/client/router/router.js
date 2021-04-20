import { app } from '/imports/lib/app.js';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { FlowRouterMeta, FlowRouterTitle } from 'meteor/ostrio:flow-router-meta';
import '/imports/client/router/routes.js';

FlowRouter.Renderer.rootElement = function () {
  return document.getElementById('rootElement');
};

// ASK FLOWROUTER TO WAIT AND PULL ALL DYNAMIC DEPENDENCIES
// BEFORE INITIALIZING ROUTER
FlowRouter.wait();
Promise.all([
  import('/imports/client/styles/fonts.sass'),
  import('/imports/client/styles/core.sass'),
  import('/imports/client/styles/font-awesome.min.css'),
  import('/imports/client/components/template-helpers.js'),
  import('/imports/client/components/layout/layout.js')
]).then(() => {
  FlowRouter.initialize();
}).catch((e) => {
  console.error('[Promise.all] loading dynamic imports error:', e);
});

const defaults = {
  name: 'Job Board',
  title: 'Job Board - NEAR Protocol',
  description: 'Find your next job at NEAR ecosystem',
  keywords: 'NEAR Protocol Jobs, NEAR Protocol, NEAR, Job, jobs, NEAR job board, job board',
  image: Meteor.absoluteUrl('social-1280x640.png')
};

defaults._404 = {
  meta: {
    robots: 'noindex, nofollow',
    name: defaults.name,
    title: '404: Page not found',
    keywords: {
      name: 'keywords',
      itemprop: 'keywords',
      content: '404, page, not found'
    },
    description: {
      name: 'description',
      itemprop: 'description',
      property: 'og:description',
      content: '404: No such page'
    },
    'twitter:site': '@nearprotocol',
    'twitter:card': 'summary_large_image',
    'twitter:description': '404: No such page',
    'twitter:image': {
      name: 'twitter:image',
      content: defaults.image
    },
    'og:locale': 'en_US',
    'og:site_name': {
      property: 'og:site_name',
      content: defaults.name
    },
    'og:type': {
      property: 'og:type',
      content: 'website'
    },
    'og:image': {
      property: 'og:image',
      content: defaults.image
    }
  }
};

FlowRouter.globals.push({ title: defaults.title });
FlowRouter.globals.push({
  meta: {
    robots: 'index, follow',
    keywords: {
      name: 'keywords',
      itemprop: 'keywords',
      content: defaults.keywords
    },
    'og:url': {
      name: 'url',
      property: 'og:url',
      content() {
        return app.currentUrl();
      }
    },
    'og:title': {
      name: 'title',
      property: 'og:title',
      content: defaults.title
    },
    description: {
      name: 'description',
      itemprop: 'description',
      property: 'og:description',
      content: defaults.description
    },
    'twitter:description': defaults.description,
    'twitter:title': defaults.title,
    'twitter:url'() {
      return app.currentUrl();
    },
    'og:image': {
      name: 'image',
      property: 'og:image',
      content: defaults.image
    },
    'twitter:image': {
      name: 'twitter:image',
      content: defaults.image
    }
  },
  link: {
    canonical: {
      rel: 'canonical',
      itemprop: 'url',
      href() {
        return app.currentUrl();
      }
    },
    image: {
      itemprop: 'image',
      content: defaults.image,
      href: defaults.image
    }
  }
});

// 404 route (catch all)
FlowRouter.route('*', {
  title: '404: Page not found',
  meta: defaults._404.meta,
  action() {
    this.render('layout', '_404');
  },
  waitOn() {
    return import('/imports/client/_404/_404.js');
  },
  whileWaiting() {
    // this.render('layout', 'loading');
  }
});

new FlowRouterTitle(FlowRouter);
new FlowRouterMeta(FlowRouter);

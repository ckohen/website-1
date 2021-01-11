<template>
  <div id="docs-body">
    <transition name="fade-resize" mode="out-in">
      <router-view v-if="docs" :docs="docs" :darkMode="darkMode" @toggleDarkMode="toggleDarkMode" @setRepository="setRepository" />
      <slide v-else>
        <loading v-if="!error" />
        <p v-else id="docs-error">
          Couldn't load the documentation data.
          <pre>{{ error.toString() }}</pre>
        </p>
      </slide>
    </transition>
  </div>
</template>

<script>
import { SHITS } from '../../util';

export default {
  name: 'docs-loader',
  props: ['source', 'tag', 'darkMode'],

  data() {
    return {
      docs: null,
      error: null,
      loadingTag: null,
      routeHook: null,
    };
  },

  methods: {
    loadDocs() {
      if (this.loadingTag === this.tag) return;
      this.docs = null;
      this.error = null;

      const startSource = this.source;
      const startTag = this.tag;
      this.loadingTag = this.tag;
      this.setRepository(this.source.repo);

      this.source.fetchDocs(this.tag).then(docs => { // eslint-disable-line complexity
        if (this.source !== startSource || this.tag !== startTag) return;
        console.log('Loading', startSource, startTag);

        // Sort everything
        docs.classes.sort((a, b) => a.name.localeCompare(b.name));
        docs.typedefs.sort((a, b) => a.name.localeCompare(b.name));
        for (const c of docs.classes) {
          if (c.props) c.props.sort((a, b) => a.name.localeCompare(b.name));
          if (c.methods) c.methods.sort((a, b) => a.name.localeCompare(b.name));
          if (c.events) c.events.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Separate classes from tables
        docs.tables = [];
        if (this.source.id === 'corncierge') {
          docs.classes = docs.classes
            .filter(c => {
              if (/Table$/.test(c.name)) {
                if (!c.name.startsWith('Base')) {
                  c.name = c.name.replace(/Table$/, '');
                }
                docs.tables.push(c);
                return true;
              } else {
                return true;
              }
            })
            .map(c => {
              if (/Table$/.test(c.name) && !c.name.startsWith('Base')) {
                c.name = c.name.replace(/Table$/, '');
                return c;
              }
              return c;
            });
        }

        // Built-in type links
        docs.links = {
          string: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String',
          number: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number',
          boolean: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean',
          symbol: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol',
          void: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined',
          Object: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
          Function: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function',
          function: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function',
          Array: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
          Set: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set',
          Map: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
          Date: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date',
          RegExp: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
          Promise: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
          Error: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
          EventEmitter: 'https://nodejs.org/dist/latest/docs/api/events.html#events_class_eventemitter',
          Timeout: 'https://nodejs.org/dist/latest/docs/api/timers.html#timers_class_timeout',
          Buffer: 'https://nodejs.org/dist/latest/docs/api/buffer.html#buffer_class_buffer',
          ReadableStream: 'https://nodejs.org/dist/latest/docs/api/stream.html#stream_class_stream_readable',
          ChildProcess: 'https://nodejs.org/dist/latest/docs/api/child_process.html#child_process_class_childprocess',
          Worker: 'https://nodejs.org/api/worker_threads.html#worker_threads_class_worker',
          MessagePort: 'https://nodejs.org/api/worker_threads.html#worker_threads_class_messageport',
        };

        // Add links for everything
        docs.externals = docs.externals || [];
        docs.classes = docs.classes || [];
        docs.typedefs = docs.typedefs || [];
        for (const x of docs.externals) docs.links[x.name] = x.see[0].replace(/\{@link\s+(.+?)\s*\}/i, '$1');
        for (const c of docs.classes) docs.links[c.name] = { name: 'docs-class', params: { class: c.name } };
        for (const t of docs.typedefs) docs.links[t.name] = { name: 'docs-typedef', params: { typedef: t.name } };

        // Workaround for the single use of inter-source see also linking
        if (this.source.id === 'commando') {
          docs.links.Message = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'Message' } };
        }

        // Workaround for corncierge inter-source see also linking
        if (this.source.id === 'corncierge') {
          docs.links.Axios = 'https://github.com/axios/axios#axios-api';
          docs.links.axiosRequest = 'https://github.com/axios/axios#request-config';
          docs.links.axiosResponse = 'https://github.com/axios/axios#response-schema';
          docs.links.httpServer = 'https://nodejs.org/api/http.html#http_class_http_server';
          docs.links.mysql2Connection = 'https://github.com/sidorares/node-mysql2/blob/master/documentation/Prepared-Statements.md';
          docs.links.mysql2Pool = 'https://github.com/sidorares/node-mysql2/blob/master/documentation';
          docs.links.RateLimiter = 'https://github.com/jhurliman/node-rate-limiter';
          docs.links.Throttle = 'https://github.com/brycebaril/node-tokenthrottle';
          docs.links.tmijsClient = 'https://github.com/tmijs/tmi.js';
          docs.links.Winston = 'https://github.com/winstonjs/winston#creating-your-own-logger';
          docs.links.APIMessage = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'APIMessage' } };
          docs.links.Channel = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'Channel' } };
          docs.links.Collection = { name: 'docs-class', params: { source: 'collection', tag: 'master', class: 'Collection' } };
          docs.links.discordjsClient = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'Client' } };
          docs.links.Guild = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'Guild' } };
          docs.links.GuildMember = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'GuildMember' } };
          docs.links.Message = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'Message' } };
          docs.links.MessageAdditions = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'MessageAdditions' } };
          docs.links.Role = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'Role' } };
          docs.links.Webhook = { name: 'docs-class', params: { source: 'main', tag: 'master', class: 'Webhook' } };
          docs.links.MessageOptions = { name: 'docs-typedef', params: { source: 'main', tag: 'master', typedef: 'MessageOptions' } };
          docs.links.Snowflake = { name: 'docs-typedef', params: { source: 'main', tag: 'master', typedef: 'Snowflake' } };
          docs.links.StringResolvable = { name: 'docs-typedef', params: { source: 'main', tag: 'master', typedef: 'StringResolvable' } };
        }

        docs.global = this.source.global;
        docs.source = this.source.source;
        docs.tag = this.tag;
        this.docs = docs;
        this.loadingTag = null;
        this.updatePageTitle(this.$route);
        console.log('Finished loading', startSource, startTag);

        // Verify the destination item exists when switching tags
        if (SHITS.switching) {
          const route = this.$route;
          SHITS.switching = false;
          if (route.name === 'docs-class') {
            if (!docs.classes.some(c => c.name === route.params.class)) this.goHome();
          } else if (route.name === 'docs-typedef') {
            if (!docs.typedefs.some(t => t.name === route.params.typedef)) this.goHome();
          } else if (route.name === 'docs-file') {
            if (!docs.custom[route.params.category] || !docs.custom[route.params.category].files[route.params.file]) {
              this.goHome();
            }
          }
        }
      }).catch(err => {
        console.error('Error while loading', startSource, startTag, err);
        this.error = err;
        this.loadingTag = null;
      });
    },

    scroll(fromRoute) {
      if (this.$route.query.scrollTo && this.docs) {
        const scroll = () => {
          let el = document.getElementById(`doc-for-${this.$route.query.scrollTo}`);
          // For backwards-compatibility of old event URLs
          if (!el) el = document.getElementById(`doc-for-e-${this.$route.query.scrollTo}`);
          if (!el) el = document.getElementById(this.$route.query.scrollTo);
          if (!el) return;
          el.setAttribute('data-scrolled', true);
          setTimeout(() => el.setAttribute('data-scrolled', false), 1000);
          setTimeout(() => el.removeAttribute('data-scrolled'), 2000);
          el.scrollIntoView();
          window.scrollBy(0, -50);
        };

        const delayScroll = fromRoute && (
          this.$route.name !== fromRoute.name ||
            this.$route.params.command !== fromRoute.params.command ||
            this.$route.params.class !== fromRoute.params.class ||
            this.$route.params.typedef !== fromRoute.params.typedef ||
            this.$route.params.file !== fromRoute.params.file
        );
        if (delayScroll) setTimeout(scroll, 400);
        else scroll();
      }
    },

    updatePageTitle(route) {
      const parent = route.matched.find(r => r.name === 'docs-tag');
      if (!parent) {
        document.title = 'discord.js';
        return;
      }

      let name;
      if (route.params.file) {
        const category = this.docs.custom[route.params.category];
        name = category && category.files[route.params.file] ? category.files[route.params.file].name : 'Unknown file';
      } else {
        const { class: command, clarse, table, typedef } = route.params;
        name = command || clarse || table || typedef || 'Search';

        if (name === 'Search') {
          const query = route.query.q;
          if (query) name = `${name}: ${query}`;
        } else if (clarse) {
          const param = route.query.scrollTo;
          if (param) name = `${name}${param.startsWith('s-') ? `.${param.slice(2)}` : `#${param.startsWith('e-') ? param.slice(2) : param}`}`;
        }
      }

      document.title = `${name} | discord.js`;
    },

    goHome() {
      console.log('Redirecting to default file due to the current page not existing in the newly-loaded tag\'s docs.');
      this.$router.replace({ name: 'docs-file', params: {
        source: this.source.id,
        tag: this.tag,
        category: this.source.defaultFile.category,
        file: this.source.defaultFile.id,
      } });
    },

    toggleDarkMode() {
      this.$emit('toggleDarkMode');
    },

    setRepository(repo) {
      this.$emit('setRepository', repo);
    },
  },

  watch: {
    source() {
      this.loadDocs();
    },

    tag() {
      this.loadDocs();
    },

    docs(to, from) {
      if (!from) setTimeout(this.scroll, 700);
    },

    $route(to, from) {
      this.scroll(from);
    },
  },

  beforeCreate() {
    this.routerHook = this.$router.beforeEach((to, _, next) => {
      this.updatePageTitle(to);
      next();
    });
  },

  created() {
    this.loadDocs();
  },

  mounted() {
    this.$nextTick(this.scroll);
  },

  beforeDestroy() {
    this.routerHook();
    this.routerHook = null;
  },
};
</script>

<style lang="scss">
  @import '../../styles/theming';

  #docs-body {
    background: $color-content-bg;

    .sk-folding-cube {
      display: block;
      margin: 200px auto;
    }
    .sk-cube:before {
      background: $color-content-bg;
    }
  }

  #docs-error {
    padding: 50px 0;
    text-align: center;
    font-size: 1.5rem;

    pre {
      font-size: 1.0rem;
    }
  }

  #app.dark #docs-body {
    background: $color-content-bg-dark;
    color: $color-content-text-dark;

    .sk-cube:before {
      background: $color-content-bg-dark;
    }
  }

  [data-scrolled] {
    transition: background 1s;
  }

  [data-scrolled='true'] {
    background: $color-scrolled-bg;
  }
</style>

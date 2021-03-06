import semver from 'semver';
import DocsSource from './DocsSource';

const branchBlacklist = new Set(['docs', 'webpack', 'v8']);
export default new DocsSource({
  id: 'corncierge',
  name: 'Corncierge',
  global: 'Corncierge',
  repo: 'ckohen/corncierge',
  defaultTag: 'master',
  branchFilter: branch => !branchBlacklist.has(branch) && !branch.startsWith('dependabot/'),
  tagFilter: tag => semver.gte(tag, '1.2.0'),
});

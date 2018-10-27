const fetch = require('node-fetch');
const utils = require('./utils');

class ResponseError extends Error {
  constructor(res, body) {
    super(`${res.status} error requesting ${res.url}: ${res.statusText}`);
    this.status = res.status;
    this.path = res.url;
    this.body = body;
  }
}

class Github {
  constructor(token, { baseUrl = 'https://api.github.com' } = {}) {
    this.baseUrl = baseUrl;
    this.token = token;

    this.publicRepos = this.publicRepos.bind(this);
    this.privateRepos = this.privateRepos.bind(this);

    this.personalRepos = this.personalRepos.bind(this);
    this.reposPersonalCommits = this.reposPersonalCommits.bind(this);
  }

  request(path, entireUrl = false, opts = {}) {
    const url = entireUrl ? `${path}` : `${this.baseUrl}${path}`;
    const options = {
      ...opts,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${this.token}`,
      },
    };

    return fetch(url, options)
      .then(res => res.json()
        .then((data) => {
          if (!res.ok) {
            throw new ResponseError(res, data);
          }

          return data;
        }));
  }

  /* ========================================================================
  /*  Timeline
  /*====================================================================== */

  // Get all user's information
  user() {
    return this.request('/user');
  }

  // Get user's login
  getLogin() {
    return this.user()
      .then(profile => profile.login);
  }

  // Get user's first date of arrays public and private (private/public)
  userFirstDate(publicFunc, privateFunc, sortFunc) {
    const self = this;
    return publicFunc()
      .then(publicArray => sortFunc(publicArray))
      .then(oldestPublic => privateFunc()
        .then(privateArray => sortFunc(privateArray))
        .then((oldestPrivate) => {
          const array = [oldestPublic, oldestPrivate];
          return utils.getOldestDate(array);
        }));
  }

  /* --------------------------------------------------------------------- */

  // Get user's location
  userLocation() {
    return this.user()
      .then(user => user.location);
  }

  // Get user's avatar url
  userAvatarUrl() {
    return this.user()
      .then(user => user.avatar_url);
  }

  // Get user's creation date
  userCreation() {
    return this.user()
      .then(user => user.created_at);
  }

  // Get user's first repository creation date (private/public)
  userFirstRepositoryDate() {
    const publicFunc = () => this.personalRepos(this.publicRepos);
    const privateFunc = () => this.personalRepos(this.privateRepos);
    return this.userFirstDate(publicFunc, privateFunc, utils.getOldestRepository);
  }

  // Get user's first commit date (private/public)
  userFirstCommitDate() {
    const publicFunc = () => this.reposPersonalCommits(this.publicRepos);
    const privateFunc = () => this.reposPersonalCommits(this.privateRepos);
    return this.userFirstDate(publicFunc, privateFunc, utils.getOldestCommit);
  }

  /* ========================================================================
  /*  1st graph : languages
  /*====================================================================== */

  // Get all languages of a repository
  repoLanguages(repoName) {
    return this.request(`/repos/${repoName}/languages`);
  }

  /* --------------------------------------------------------------------- */

  // Get all languages of the user and contributors (private)
  userLanguages() {
    return this.privateRepos()
      .then((repos) => {
        const getLanguages = repo => this.repoLanguages(repo.full_name);
        return Promise.all(repos.map(getLanguages));
      });
  }

  /* ========================================================================
  /*  2nd graph : issues
  /*====================================================================== */

  // Get all user's issues from his own repos
  issues() {
    return this.request('/user/issues');
  }

  // Get all user's issues by state
  userIssuesByState(state) {
    return this.issues()
      .then((issues) => {
        const stateIssues = issue => (issue.state === state ? 1 : 0);
        return Promise.all(issues.map(stateIssues))
          .then(results => results.reduce((elem, acc) => elem + acc, 0));
      });
  }

  /* --------------------------------------------------------------------- */

  // Get all user's opened issues
  userOpenedIssues() {
    return this.userIssuesByState('open');
  }

  // Get all user's closed issues
  userClosedIssues() {
    return this.userIssuesByState('close');
  }

  /* ========================================================================
  /*  3nd graph : coded lines and commits
  /* ====================================================================== */

  // Get all commits by repository
  repoCommits(repoName) {
    return this.request(`/repos/${repoName}/commits`);
  }

  // Get all personal commits of user's repositories by type private or public
  reposPersonalCommits(typeRepos) {
    return typeRepos()
      .then(repos => this.getLogin()
        .then((username) => {
          // Get all personal commits
          const getCommits = repo => this.repoCommits(repo.full_name)
            .then(commits => (commits).filter(commit => commit.author != null
              && commit.author.login === username));

          // Get all commits of the user
          return Promise.all(repos.map(getCommits))
            .then(results => results.reduce((acc, elem) => acc.concat(elem), []));
        }));
  }

  // Get number of coded lines for the last 100 commits by type private or public
  reposCountCodedLinesForLastHundredCommits(typeRepos1, typeRepos2) {
    return this.reposPersonalCommits(typeRepos1)
      .then(commitsType1 => this.reposPersonalCommits(typeRepos2)
        .then(commitsType2 => commitsType1.concat(commitsType2)))
      .then((commitsReceived) => {
        // Get the last 100 commits
        const commits = utils.getLastCommits(commitsReceived, 100);

        // Get all urls of user's personal commits
        const url = commit => commit.url;
        return commits.map(url);
      })
      .then((urls) => {
        // Get all lines added in public personal commits
        const lines = url => this.request(url, true)
          .then(commit => commit.stats.additions);

        return Promise.all(urls.map(lines))
          .then(results => results.reduce((elem, acc) => elem + acc, 0));
      });
  }

  /* --------------------------------------------------------------------- */

  // Get user's number of coded lines (private/public)
  userCountCodedLines() {
    return this.reposCountCodedLinesForLastHundredCommits(this.publicRepos, this.privateRepos);
  }

  // Get user's number of commits (private/public)
  userCountCommits() {
    return this.reposPersonalCommits(this.publicRepos)
      .then(publicCommits => this.reposPersonalCommits(this.privateRepos)
        .then(privateCommits => privateCommits.length + publicCommits.length));
  }

  /* ========================================================================
  /*  4nd graph : repositories
  /*====================================================================== */

  // Get all user's public repositories
  publicRepos() {
    return this.getLogin()
      .then(username => this.request(`/users/${username}/repos`));
  }

  // Get all user's private repositories
  privateRepos() {
    return this.request('/user/repos');
  }

  // Get all user's personal repositories by type of data
  personalRepos(typeRepos) {
    return typeRepos()
      .then(repos => this.getLogin()
        .then(username => repos.filter(repo => repo.owner.login === username)));
  }

  // Get number of forked repositories by type private or public
  reposCountForkedRepositories(typeRepos) {
    const self = this;
    return typeRepos()
      .then((repos) => {
        const nbrForkedRepositories = repo => (repo.fork === true ? 1 : 0);
        return Promise.all(repos.map(nbrForkedRepositories))
          .then(results => results.reduce((elem, acc) => elem + acc, 0));
      });
  }

  // Get number of stars of the repositories by type private or public
  reposCountStarsRepositories(typeRepos) {
    const self = this;
    return typeRepos()
      .then((repos) => {
        const stars = repo => repo.stargazers_count;
        return Promise.all(repos.map(stars))
          .then(results => results.reduce((elem, acc) => elem + acc, 0));
      });
  }

  /* --------------------------------------------------------------------- */

  // Get user's number of created repositories (private/public)
  userCountCreatedRepositories() {
    return this.personalRepos(this.publicRepos)
      .then(publicRepos => this.personalRepos(this.privateRepos)
        .then(privateRepos => publicRepos.length + privateRepos.length));
  }

  // Get all user's forked repositories (private/public)
  userCountForkedRepositories() {
    return this.reposCountForkedRepositories(this.publicRepos)
      .then(publicForked => this.reposCountForkedRepositories(this.privateRepos)
        .then(privateForked => privateForked + publicForked));
  }

  // Get all user's stars (private/public)
  userCountStarsRepositories() {
    return this.reposCountStarsRepositories(this.publicRepos)
      .then(publicStars => this.reposCountStarsRepositories(this.privateRepos)
        .then(privateStars => privateStars + publicStars));
  }
}

module.exports = Github;

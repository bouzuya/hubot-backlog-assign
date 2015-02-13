// Description
//   A Hubot script that assigns the backlog issue to reviewer
//
// Configuration:
//   HUBOT_BACKLOG_ASSIGN_SPACE_ID
//   HUBOT_BACKLOG_ASSIGN_API_KEY
//   HUBOT_BACKLOG_ASSIGN_USER_NAMES
//
// Commands:
//   <user> review <issueKey> - assigns the issue to user
//
// Author:
//   bouzuya <m@bouzuya.net>
//
var parseConfig, request;

request = require('request-b');

parseConfig = require('hubot-config');

module.exports = function(robot) {
  var assign, baseUrl, config, getGithubUrl, getIssue, getUser, updateIssue;
  config = parseConfig('backlog-assign', {
    spaceId: null,
    apiKey: null,
    userNames: '{}'
  });
  config.userNames = JSON.parse(config.userNames);
  baseUrl = "https://" + config.spaceId + ".backlog.jp";
  getIssue = function(issueKey) {
    return request({
      method: 'GET',
      url: baseUrl + "/api/v2/issues/" + issueKey,
      qs: {
        apiKey: config.apiKey
      }
    }).then(function(res) {
      if (res.statusCode >= 400) {
        throw new Error(res.body);
      }
      return JSON.parse(res.body);
    });
  };
  getGithubUrl = function(issueKey) {
    return request({
      method: 'GET',
      url: baseUrl + "/api/v2/issues/" + issueKey + "/comments",
      qs: {
        apiKey: config.apiKey,
        order: 'desc'
      }
    }).then(function(res) {
      if (res.statusCode >= 400) {
        throw new Error(res.body);
      }
      return JSON.parse(res.body).map(function(c) {
        var _ref, _ref1;
        return (_ref = c.content) != null ? (_ref1 = _ref.match(/(https:\/\/github\.com\/\S+)/)) != null ? _ref1[1] : void 0 : void 0;
      }).filter(function(m) {
        return m;
      })[0];
    });
  };
  getUser = function(projectKey, name) {
    return request({
      method: 'GET',
      url: baseUrl + "/api/v2/projects/" + projectKey + "/users",
      qs: {
        apiKey: config.apiKey
      }
    }).then(function(res) {
      var users;
      if (res.statusCode >= 400) {
        throw new Error(res.body);
      }
      users = JSON.parse(res.body);
      return users.filter(function(u) {
        return u.userId === name;
      })[0];
    });
  };
  updateIssue = function(_arg) {
    var assigneeId, comment, issueKey;
    issueKey = _arg.issueKey, assigneeId = _arg.assigneeId, comment = _arg.comment;
    return request({
      method: 'PATCH',
      url: baseUrl + "/api/v2/issues/" + issueKey,
      qs: {
        apiKey: config.apiKey
      },
      form: {
        assigneeId: assigneeId,
        comment: comment
      }
    }).then(function(res) {
      if (res.statusCode >= 400) {
        throw new Error(res.body);
      }
      return JSON.parse(res.body);
    });
  };
  assign = function(res, projectKey, issueNo, reviewer) {
    var assigneeId, comment, githubUrl, issueKey;
    issueKey = projectKey + "-" + issueNo;
    githubUrl = null;
    comment = null;
    assigneeId = null;
    return getIssue(issueKey).then(function(issue) {
      if (issue.status.id !== 3) {
        return res.send(issue.issueKey + " " + issue.summary + "\n" + baseUrl + "/view/" + issue.issueKey + "\n\nまだ処理中ですよ？");
      }
      return getGithubUrl(issueKey).then(function(g) {
        githubUrl = g;
        comment = "レビューをおねがいします。\n" + githubUrl;
        return getUser(projectKey, reviewer);
      }).then(function(u) {
        return assigneeId = u.id;
      }).then(function() {
        return updateIssue({
          issueKey: issueKey,
          assigneeId: assigneeId,
          comment: comment
        });
      }).then(function(issue) {
        return res.send(issue.issueKey + " " + issue.summary + "\n" + baseUrl + "/view/" + issue.issueKey + "\n" + comment);
      }).then(null, function(e) {
        res.robot.logger.error(e);
        return res.send('hubot-backlog-assign: error');
      });
    });
  };
  return robot.hear(/^[@]?([^:,\s]+)[:,]?\s*(?:review ([a-zA-Z_]+)-(\d+)$)/, function(res) {
    var issueNo, projectKey, reviewerChatName, reviewerName;
    reviewerChatName = res.match[1];
    projectKey = res.match[2];
    issueNo = res.match[3];
    reviewerName = config.userNames[reviewerChatName];
    if (reviewerName == null) {
      return res.send("unknown user: " + reviewerChatName + "\nplease set HUBOT_BACKLOG_ASSIGN_USER_NAMES.\nHUBOT_BACKLOG_ASSIGN_USER_NAMES='{\"" + reviewerChatName + "\":\"<backlog name>\"}'");
    }
    return assign(res, projectKey, issueNo, reviewerName);
  });
};

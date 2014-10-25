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
module.exports = function(robot) {
  var API_KEY, SPACE_ID, USER_NAMES, assign, getGithubUrl, getUser, request, updateIssue, _ref;
  request = require('request-b');
  SPACE_ID = process.env.HUBOT_BACKLOG_ASSIGN_SPACE_ID;
  API_KEY = process.env.HUBOT_BACKLOG_ASSIGN_API_KEY;
  USER_NAMES = JSON.parse((_ref = process.env.HUBOT_BACKLOG_ASSIGN_USER_NAMES) != null ? _ref : '{}');
  getGithubUrl = function(issueKey) {
    return request({
      method: 'GET',
      url: "https://" + SPACE_ID + ".backlog.jp/api/v2/issues/" + issueKey + "/comments",
      qs: {
        apiKey: API_KEY
      }
    }).then(function(res) {
      var comments;
      if (res.statusCode >= 400) {
        throw new Error(res.body);
      }
      comments = JSON.parse(res.body).reverse();
      return comments.map(function(c) {
        var _ref1;
        return (_ref1 = c.content.match(/(https:\/\/github\.com\/\S+)/)) != null ? _ref1[1] : void 0;
      }).filter(function(m) {
        return m;
      })[0];
    });
  };
  getUser = function(projectKey, name) {
    return request({
      method: 'GET',
      url: "https://" + SPACE_ID + ".backlog.jp/api/v2/projects/" + projectKey + "/users",
      qs: {
        apiKey: API_KEY
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
      url: "https://" + SPACE_ID + ".backlog.jp/api/v2/issues/" + issueKey,
      qs: {
        apiKey: API_KEY
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
    issueKey = "" + projectKey + "-" + issueNo;
    githubUrl = null;
    comment = null;
    assigneeId = null;
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
      return res.send("" + issue.issueKey + " " + issue.summary + "\nhttps://" + SPACE_ID + ".backlog.jp/view/" + issue.issueKey + "\n" + comment);
    }).then(null, function(e) {
      res.robot.logger.error(e);
      return res.send('hubot-backlog-assign: error');
    });
  };
  return robot.hear(/^[@]?(\S+)[:,]?\s*(?:review ([a-zA-Z_]+)-(\d+)$)/, function(res) {
    var issueNo, projectKey, reviewerChatName, reviewerName;
    reviewerChatName = res.match[1];
    projectKey = res.match[2];
    issueNo = res.match[3];
    reviewerName = USER_NAMES[reviewerChatName];
    if (reviewerName == null) {
      return res.send("unknown user: " + reviewerChatName + "\nplease set HUBOT_BACKLOG_ASSIGN_USER_NAMES.\nHUBOT_BACKLOG_ASSIGN_USER_NAMES='{\"" + reviewerChatName + "\":\"<backlog name>\"}'");
    }
    return assign(res, projectKey, issueNo, reviewerName);
  });
};

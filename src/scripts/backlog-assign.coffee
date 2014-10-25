# Description
#   A Hubot script that assigns the backlog issue to reviewer
#
# Configuration:
#   HUBOT_BACKLOG_ASSIGN_SPACE_ID
#   HUBOT_BACKLOG_ASSIGN_API_KEY
#   HUBOT_BACKLOG_ASSIGN_USER_NAMES
#
# Commands:
#   <user> review <issueKey> - assigns the issue to user
#
# Author:
#   bouzuya <m@bouzuya.net>
#
module.exports = (robot) ->
  request = require 'request-b'

  SPACE_ID = process.env.HUBOT_BACKLOG_ASSIGN_SPACE_ID
  API_KEY = process.env.HUBOT_BACKLOG_ASSIGN_API_KEY
  USER_NAMES = JSON.parse(process.env.HUBOT_BACKLOG_ASSIGN_USER_NAMES ? '{}')

  getGithubUrl = (issueKey) ->
    request
      method: 'GET'
      url: "https://#{SPACE_ID}.backlog.jp/api/v2/issues/#{issueKey}/comments"
      qs:
        apiKey: API_KEY
    .then (res) ->
      throw new Error(res.body) if res.statusCode >= 400
      comments = JSON.parse(res.body).reverse()
      comments
        .map (c) ->
          c.content.match(/(https:\/\/github\.com\/\S+)/)?[1]
        .filter((m) -> m)[0]

  getUser = (projectKey, name) ->
    request
      method: 'GET'
      url: "https://#{SPACE_ID}.backlog.jp/api/v2/projects/#{projectKey}/users"
      qs:
        apiKey: API_KEY
    .then (res) ->
      throw new Error(res.body) if res.statusCode >= 400
      users = JSON.parse(res.body)
      users.filter((u) -> u.userId is name)[0]

  updateIssue = ({ issueKey, assigneeId, comment }) ->
    request
      method: 'PATCH'
      url: "https://#{SPACE_ID}.backlog.jp/api/v2/issues/#{issueKey}"
      qs:
        apiKey: API_KEY
      form:
        assigneeId: assigneeId
        comment: comment
    .then (res) ->
      throw new Error(res.body) if res.statusCode >= 400
      JSON.parse(res.body)

  assign = (res, projectKey, issueNo, reviewer) ->
    issueKey = "#{projectKey}-#{issueNo}"
    githubUrl = null
    comment = null
    assigneeId = null
    getGithubUrl(issueKey)
      .then (g) ->
        githubUrl = g
        comment = """
          レビューをおねがいします。
          #{githubUrl}
        """
        getUser projectKey, reviewer
      .then (u) ->
        assigneeId = u.id
      .then ->
        updateIssue { issueKey, assigneeId, comment }
      .then (issue) ->
        res.send """
          #{issue.issueKey} #{issue.summary}
          https://#{SPACE_ID}.backlog.jp/view/#{issue.issueKey}
          #{comment}
        """
      .then null, (e) ->
        res.robot.logger.error(e)
        res.send 'hubot-backlog-assign: error'

  robot.hear /^[@]?(\S+)[:,]?\s*(?:review ([a-zA-Z_]+)-(\d+)$)/, (res) ->
    reviewerChatName = res.match[1]
    projectKey = res.match[2]
    issueNo = res.match[3]
    reviewerName = USER_NAMES[reviewerChatName]
    return res.send """
      unknown user: #{reviewerChatName}
      please set HUBOT_BACKLOG_ASSIGN_USER_NAMES.
      HUBOT_BACKLOG_ASSIGN_USER_NAMES='{"#{reviewerChatName}":"<backlog name>"}'
    """ unless reviewerName?
    assign res, projectKey, issueNo, reviewerName

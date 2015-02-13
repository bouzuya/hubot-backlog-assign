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
request = require 'request-b'
parseConfig = require 'hubot-config'

module.exports = (robot) ->
  config =
    parseConfig 'backlog-assign',
      spaceId: null
      apiKey: null
      userNames: '{}'

  config.userNames = JSON.parse(config.userNames)

  baseUrl = "https://#{config.spaceId}.backlog.jp"

  getIssue = (issueKey) ->
    request
      method: 'GET'
      url: "#{baseUrl}/api/v2/issues/#{issueKey}"
      qs:
        apiKey: config.apiKey
    .then (res) ->
      throw new Error(res.body) if res.statusCode >= 400
      JSON.parse(res.body)

  getGithubUrl = (issueKey) ->
    request
      method: 'GET'
      url: "#{baseUrl}/api/v2/issues/#{issueKey}/comments"
      qs:
        apiKey: config.apiKey
        order: 'desc'
    .then (res) ->
      throw new Error(res.body) if res.statusCode >= 400
      JSON.parse(res.body)
        .map (c) ->
          c.content?.match(/(https:\/\/github\.com\/\S+)/)?[1]
        .filter((m) -> m)[0]

  getUser = (projectKey, name) ->
    request
      method: 'GET'
      url: "#{baseUrl}/api/v2/projects/#{projectKey}/users"
      qs:
        apiKey: config.apiKey
    .then (res) ->
      throw new Error(res.body) if res.statusCode >= 400
      users = JSON.parse(res.body)
      users.filter((u) -> u.userId is name)[0]

  updateIssue = ({ issueKey, assigneeId, comment }) ->
    request
      method: 'PATCH'
      url: "#{baseUrl}/api/v2/issues/#{issueKey}"
      qs:
        apiKey: config.apiKey
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
    getIssue(issueKey)
      .then (issue) ->
        return res.send("""
          #{issue.issueKey} #{issue.summary}
          #{baseUrl}/view/#{issue.issueKey}

          まだ処理中ですよ？
        """) unless issue.status.id is 3
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
              #{baseUrl}/view/#{issue.issueKey}
              #{comment}
            """
          .then null, (e) ->
            res.robot.logger.error(e)
            res.send 'hubot-backlog-assign: error'

  robot.hear /^[@]?([^:,\s]+)[:,]?\s*(?:review ([a-zA-Z_]+)-(\d+)$)/, (res) ->
    reviewerChatName = res.match[1]
    projectKey = res.match[2]
    issueNo = res.match[3]
    reviewerName = config.userNames[reviewerChatName]
    return res.send """
      unknown user: #{reviewerChatName}
      please set HUBOT_BACKLOG_ASSIGN_USER_NAMES.
      HUBOT_BACKLOG_ASSIGN_USER_NAMES='{"#{reviewerChatName}":"<backlog name>"}'
    """ unless reviewerName?
    assign res, projectKey, issueNo, reviewerName

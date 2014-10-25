# hubot-backlog-assign

A Hubot script that assigns the backlog issue to reviewer

## Installation

    $ npm install https://github.com/bouzuya/hubot-backlog-assign/archive/master.tar.gz

or

    $ npm install https://github.com/bouzuya/hubot-backlog-assign/archive/{VERSION}.tar.gz

## Example

    bouzuya> @emanon001 review SUSHI-123
      hubot> SUSHI-123 issue summary
             https://space.backlog.jp/view/SUSHI-123
             レビューをおねがいします。
             https://github.com/faithcreates/sushi/pull/2

## Configuration

See [`src/scripts/backlog-assign.coffee`](src/scripts/backlog-assign.coffee).

## Development

`npm run`

## License

[MIT](LICENSE)

## Author

[bouzuya][user] &lt;[m@bouzuya.net][mail]&gt; ([http://bouzuya.net][url])

## Badges

[![Build Status][travis-badge]][travis]
[![Dependencies status][david-dm-badge]][david-dm]
[![Coverage Status][coveralls-badge]][coveralls]

[travis]: https://travis-ci.org/bouzuya/hubot-backlog-assign
[travis-badge]: https://travis-ci.org/bouzuya/hubot-backlog-assign.svg?branch=master
[david-dm]: https://david-dm.org/bouzuya/hubot-backlog-assign
[david-dm-badge]: https://david-dm.org/bouzuya/hubot-backlog-assign.png
[coveralls]: https://coveralls.io/r/bouzuya/hubot-backlog-assign
[coveralls-badge]: https://img.shields.io/coveralls/bouzuya/hubot-backlog-assign.svg
[user]: https://github.com/bouzuya
[mail]: mailto:m@bouzuya.net
[url]: http://bouzuya.net

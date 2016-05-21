# local-news-lambda
Part of a local news scanning application. This AWS Lambda function takes a list of sitemaps and home pages that belong to local news websites, then efficiently extracts all links from them.
### Installation
You need the Grunt CLI installed globally:
```sh
$ npm install -g grunt-cli
```
Once you've cloned the repository:
```sh
$ npm install
```
To package the project up as a Lambda deliverable:
```sh
$ grunt lambda_package
```
### Resources
* [Using Grunt to package and deploy to AWS Lambda](https://github.com/Tim-B/grunt-aws-lambda)
* [Guidelines for XML sitemap formatting](http://www.sitemaps.org/)

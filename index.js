var request = require('request');
var async = require('async');
var url = require('url');

exports.handler = function(event, context) {

	/**
	* Extracts links out of the body of a web page
	* @param {String} link - The url of the page being parsed
	* @param {String} body - The html body of the page
	* @param {Function} cb - Async callback function
	* @callback {Function} cb - List of links is passed back with callback
	*/

	function parsePage(link, body, cb) {
		var links = [];
		//This regex matches any href type of link
		var matches = body.match(/href="([^\'\"]+)/g);
		//Extracts the www.domain.com part of the URL
		var host = url.parse(link).host;

		for(var i = 0; i < matches.length; i++) {
			//Removes the href=" that is matched by regex
			var match = matches[i].substr(6, matches[i].length);
			//If link is a local reference, like /about-page
			if(match[0] == '/') {
				//Concatenate domain name with local path to make valid link
				links.push(link + match);
			} else {
				var details = url.parse(match);
				//Checks if links belong to same host
				if(host == details.host) {
					links.push(match);
				}
			}
		}
  		cb(null, links);
	}

	/**
	* Extracts links from sitemaps
	* @param {String} body - The xml body of the sitemap
	* @param {Function} cb - Async callback function
	* @callback {Function} cb - List of links is passed back with callback
	*/

	function parseSitemap(body, cb) {
		var links = [];
		//Extracts the content inbetween <url> tags
		var matches = body.match(/<url>([^]*?)<\/url>/g);
		var time = (new Date).getTime();
		//Represents 3 days * 24 hrs * 60 min * 60 s * 1000 ms, so 3 days in unix
		var span = 3 * 86400000;
		//At most extract 50 links, since some sitemaps have thousands
		var limit = 50;
		//In case there are less than 50 links
		if(limit > matches.length) {
			limit = matches.length;
		}
		for(var i = 0; i < matches.length; i++) {
			//Stop if we've hit the limit
			if(links.length >= limit) {
				break;
			}
			//Matches all the links in the sitemap
			var match = matches[i].match(/<loc>([^\<]+)/g);
			if(match) {
				//Crops off the <loc> part of string
				match = match[0].substr(5, match[0].length);
				//Gets the date if given
				var lastmod = matches[i].match(/<lastmod>([^\<]+)/g);
				//Another way the date can be listed
				var date = matches[i].match(/<news:publication_date>([^\<]+)/g);
				if(lastmod) {
					//Crop out the <lastmod>
					lastmod = lastmod[0].substr(9, lastmod[0].length);
					//Time in ms of lastmod date
					var millis = Date.parse(lastmod);
					//In case date is invalid
					if(millis) {
						//If current time - lastmod time is within 3 days
						if((time - millis) < span) {
							links.push(match);
						}
					}
				} else if(date) {
					//Crop out the <news>
					date = date[0].substr(23, date[0].length);
					var millis = Date.parse(date);
					//In case date is invalid
					if(millis) {
						//If current time - news date time is within 3 days
						if((time - millis) < span) {
							links.push(match);
						}
					}
				}
			}
		}
		cb(null, links);
	}

	/**
	* Launches HTTP request
	* @param {String} link - The sitemap or homepage link to extract links from
	* @param {Function} cb - Async callback function passed to parseSitemap and parsePage
	*/

	function extract(link, cb) {
		//Set User-Agent to copy Google Bot
		var agent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
		//If the link is an XML file, aka a sitemap
		if(link.substr(link.length - 3) == 'xml') {
			request({url: link, headers: {'User-Agent': agent}}, function (error, response, body) {
			    if (!error && response.statusCode == 200) parseSitemap(body, cb);
			    else console.log(error);
			});
			//Normal homepage of site
		} else {
			link = 'http://' + link;
			request({url: link, headers: {'User-Agent': agent}}, function (error, response, body) {
			    if (!error && response.statusCode == 200) parsePage(link, body, cb);
			    else console.log(error);
			});
		}
	}

	var links = [];
	//Decode all passed in URLs
	for(var i = 0; i < event.length; i++) {
		links.push(new Buffer(event[i], 'base64').toString("ascii"));
	}
	//If there are more than 20 links, trim them down
	if(links.length > 20) {
		links = links.slice(0, 25);
	}
	//Run extraction on all links asynchronously
	async.map(links, extract, function(err, results) {
		if(err) console.log(err);
		//combine the arrays of links and return them
	  return context.succeed({"links": [].concat.apply([], results)});
	});

};

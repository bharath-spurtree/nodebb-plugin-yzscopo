'use strict';

var Topics = require.main.require('./src/topics');
var Posts = require.main.require('./src/posts');
var apiMiddleware = require('nodebb-plugin-yzscopo/routes/v5/middleware');
var errorHandler = require('nodebb-plugin-yzscopo/lib/errorHandler');
var utils = require('nodebb-plugin-yzscopo/routes/v5/utils');
var winston = require.main.require('winston');

module.exports = function () {
	var app = require('express').Router();

	app.route('/')
		.post(apiMiddleware.requireUser, function (req, res) {
			if (!utils.checkRequired(['cid', 'title', 'content'], req, res)) {
				return false;
			}

			var payload = { ...req.body };
			payload.tags = payload.tags || [];
			payload.uid = req.user.uid;

			Topics.post(payload, function (err, data) {
				return errorHandler.handle(err, res, data);
			});
		});

	app.route('/:tid')
		.post(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			if (!utils.checkRequired(['content'], req, res)) {
				return false;
			}

			var payload = {
				tid: req.params.tid,
				uid: req.user.uid,
				req: utils.buildReqObject(req),	// For IP recording
				content: req.body.content,
				timestamp: req.body.timestamp,
			};

			if (req.body.toPid) { payload.toPid = req.body.toPid; }

			Topics.reply(payload, function (err, returnData) {
				errorHandler.handle(err, res, returnData);
			});
		})
		.delete(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.purgePostsAndTopic(req.params.tid, req.params._uid, function (err) {
				errorHandler.handle(err, res);
			});
		})
		.put(apiMiddleware.requireUser, function (req, res) {
			if (!utils.checkRequired(['pid', 'content'], req, res)) {
				return false;
			}

			var payload = {
				uid: req.user.uid,
				pid: req.body.pid,
				content: req.body.content,
				options: {},
			};
			console.log(payload);

			// Maybe a "set if available" utils method may come in handy
			if (req.body.handle) { payload.handle = req.body.handle; }
			if (req.body.title) { payload.title = req.body.title; }
			if (req.body.topic_thumb) { payload.options.topic_thumb = req.body.topic_thumb; }
			if (req.body.tags) { payload.options.tags = req.body.tags; }

			Posts.edit(payload, function (err, returnData) {
				errorHandler.handle(err, res, returnData);
			});
		});

	app.route('/:tid/state')
		.put(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.restore(req.params.tid, req.params._uid, function (err) {
				errorHandler.handle(err, res);
			});
		})
		.delete(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.delete(req.params.tid, req.params._uid, function (err) {
				errorHandler.handle(err, res);
			});
		});

	app.route('/:tid/follow')
		.put(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.follow(req.params.tid, req.user.uid, function (err) {
				errorHandler.handle(err, res);
			});
		})
		.delete(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.unfollow(req.params.tid, req.user.uid, function (err) {
				errorHandler.handle(err, res);
			});
		});

	app.route('/:tid/tags')
		.put(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			if (!utils.checkRequired(['tags'], req, res)) {
				return false;
			}

			Topics.createTags(req.body.tags, req.params.tid, Date.now(), function (err) {
				errorHandler.handle(err, res);
			});
		})
		.delete(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.deleteTopicTags(req.params.tid, function (err) {
				errorHandler.handle(err, res);
			});
		});

	app.route('/:tid/pin')
		.put(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.tools.pin(req.params.tid, req.user.uid, function (err) {
				errorHandler.handle(err, res);
			});
		})
		.delete(apiMiddleware.requireUser, apiMiddleware.validateTid, function (req, res) {
			Topics.tools.unpin(req.params.tid, req.user.uid, function (err) {
				errorHandler.handle(err, res);
			});
		});

	app.route('/recent')
		.get(apiMiddleware.requireUser, async function (req, res) {
			console.log(req.body)
			let { cid, _uid, start, stop } = req.body
			await Topics.getRecentTopics(cid, _uid, start, stop, '')
				.then((response) => res.send(response))
				.catch((err) => errorHandler.handle(err, res))
		})

	// **DEPRECATED** Do not use.
	app.route('/follow')
		.post(apiMiddleware.requireUser, function (req, res) {
			winston.warn('[yzscopo] /api/v1/topics/follow route has been deprecated, please use /api/v1/topics/:tid/follow instead.');
			if (!utils.checkRequired(['tid'], req, res)) {
				return false;
			}

			Topics.follow(req.body.tid, req.user.uid, function (err) {
				errorHandler.handle(err, res);
			});
		})
		.delete(apiMiddleware.requireUser, function (req, res) {
			winston.warn('[yzscopo] /api/v1/topics/follow route has been deprecated, please use /api/v1/topics/:tid/follow instead.');
			if (!utils.checkRequired(['tid'], req, res)) {
				return false;
			}

			Topics.unfollow(req.body.tid, req.user.uid, function (err) {
				errorHandler.handle(err, res);
			});
		});

	return app;
};

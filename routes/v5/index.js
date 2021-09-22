'use strict';

const apiMiddleware = require('nodebb-plugin-yzscopo/routes/v5/middleware');
const utils = require('nodebb-plugin-yzscopo/routes/v5/utils');
const errorHandler = require('nodebb-plugin-yzscopo/lib/errorHandler');
const plugins = require.main.require('./src/plugins');
const writeApi = module.parent.parent.exports;

module.exports = function (app, coreMiddleware) {
	app.use(function (req, res, next) {
		if (writeApi.settings.requireHttps === 'on' && req.protocol !== 'https') {
			res.set('Upgrade', 'TLS/1.0, HTTP/1.1');
			return errorHandler.respond(426, res);
		}
		next();
	});

	app.use(async (req, res, next) => {
		// Allow plugins to hook into arbitrary routes
		await plugins.hooks.fire('response:plugin.yzscopo.route', {
			req: req,
			res: res,
			utils: utils,
			errorHandler: errorHandler,
			method: req.method,
			route: req.originalUrl,
		});

		if (!res.headersSent) {
			next();
		}
	});

	app.use('/users', require('nodebb-plugin-yzscopo/routes/v5/users')(coreMiddleware));
	app.use('/groups', require('nodebb-plugin-yzscopo/routes/v5/groups')(coreMiddleware));
	app.use('/posts', require('nodebb-plugin-yzscopo/routes/v5/posts')(coreMiddleware));
	app.use('/topics', require('nodebb-plugin-yzscopo/routes/v5/topics')(coreMiddleware));
	app.use('/categories', require('nodebb-plugin-yzscopo/routes/v5/categories')(coreMiddleware));
	app.use('/util', require('nodebb-plugin-yzscopo/routes/v5/util')(coreMiddleware));

	app.get('/ping', function (req, res) {
		res.status(200).json({
			code: 'ok',
			message: 'pong',
			params: {},
		});
	});

	app.post('/ping', apiMiddleware.requireUser, function (req, res) {
		res.status(200).json({
			code: 'ok',
			message: 'pong, accepted test POST ping for uid ' + req.user.uid,
			params: {
				uid: req.user.uid,
			},
		});
	});

	// This router is reserved exclusively for plugins to add their own routes into the write api plugin. Confused yet? :trollface:
	var customRouter = require('express').Router();
	plugins.hooks.fire('filter:plugin.yzscopo.routes', {
		router: customRouter,
		apiMiddleware: apiMiddleware,
		middleware: coreMiddleware,
		errorHandler: errorHandler,
	}, function (err, payload) {
		if (err) {
			// ¯\_(ツ)_/¯
		}

		app.use('/', payload.router);

		app.use(function (req, res) {
			// Catch-all
			errorHandler.respond(404, res);
		});
	});

	return app;
};

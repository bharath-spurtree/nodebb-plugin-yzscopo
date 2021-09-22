'use strict';
/* globals module, require */

var express = require('express');

module.exports = function (middleware) {
	var v5 = require('nodebb-plugin-yzscopo/routes/v5')(express.Router(), middleware);

	return {
		v5: v5
	};
};
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js';

import angular from 'angular';

import './infinityscroll.css';
import './infinityscroll.js';

(function (ng, __) {
	'use strict';
	ng.module('app', ['infinity.scroll']).controller('AppCtrl', AppCtrl);
	function AppCtrl() {
		var ctrl = this;
		ctrl.items = __.range(200);
		ctrl.limit = 25;
		ctrl.begin = 0;
	}
})(angular, _);

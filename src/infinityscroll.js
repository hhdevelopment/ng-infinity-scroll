require("./infinityscroll.html");
require("./infinityscroll.css");
(function (ng) {
	var MODULENAME = 'infinity.scroll';
	var DIRECTIVENAME = 'infinityScroll';
	var SCROLLBY = 3;
	'use strict';
	ng.module(MODULENAME, []).directive(DIRECTIVENAME, InfinityScroll);
	/* @ngInject */
	function InfinityScroll($timeout, $window) {
		return {
			restrict: 'E',
			templateUrl: "infinityscroll.html",
			controller: InfinityScrollCtrl,
			controllerAs: 'ctrl',
			transclude: true,
			scope: {
				'total': '<',
				'width': '<',
				'showInfoDelay': '<',
				'ngBegin': '=',
				'ngLimit': '=',
				'ngMoveWindow': '&'
			}, link: function (scope, elt, attrs) {
				elt.find('ng-transclude').css({'width': 'calc(100% - ' + (scope.width | 4) + 'px)'});
				var watcherClears = [];
				watcherClears.push(scope.$watchGroup(['total'], function (vs1, vs2, s) {
					withTD = false;
					$timeout(computeLimit, 500, true, $timeout, s, elt);
				}, false));
				watcherClears.push(scope.$watchGroup(['ngLimit'], function (vs1, vs2, s) {
					$timeout(computeLimit, 300, true, $timeout, s, elt);
				}, false));
				watcherClears.push(scope.$watchGroup(['ngBegin'], function (vs1, vs2, s) {
					computeY(s, elt);
					var posY = (s.ngBegin * 100) / (s.total - s.ngLimit);
					s.ctrl.posY = moveGrabber($timeout, s, elt, posY);
				}, false));
				scope.$on('$destroy', function () {
					// stop watching when scope is destroyed
					watcherClears.forEach(function (watcherClear) {
						watcherClear();
					});
				});
				$(window).on('resize', function (event) {
					scope.ngLimit = 25;
					withTD = false;
					$timeout(computeLimit, 200, true, $timeout, scope, elt);
				});
				elt.bind("wheel", function (event) {
					scope.$apply(function () {
						scope.ctrl.wheel(event);
					});
				});
				elt.bind("click", function (event) {
					scope.$apply(function () {
						scope.ctrl.click(event);
					});
				});
				elt.bind("mouseover", function (event) {
					scope.$apply(function () {
						scope.ctrl.mouseover(event);
					});
				});
				elt.bind("mouseout", function (event) {
					scope.$apply(function () {
						scope.ctrl.mouseout(event);
					});
				});
				elt.bind("mousedown", function (event) {
					scope.$apply(function () {
						scope.ctrl.mousedown(event);
					});
				});
				ng.element(document).bind("mouseup", function (event) {
					scope.$apply(function () {
						scope.ctrl.mouseup(event, elt);
					});
				});
				ng.element(document).bind("mousemove", function (event) {
					scope.$apply(function () {
						scope.ctrl.mousemove(event, elt);
					});
				});
			}
		};
	}
	function InfinityScrollCtrl($timeout, $scope) {
		var ctrl = this;
		ctrl.getRange = function () {
			return "[" + Math.ceil($scope.ngBegin + 1) + "-" + Math.ceil($scope.ngBegin + Math.min($scope.ngLimit, $scope.total)) + "]";
		};
		ctrl.posY = 0; // position en % du grabber 
		ctrl.sizeY = 100; // la taille en % du grabber
		ctrl.onscroll = false; // ca bouge, on affiche l'infobule
		ctrl.ondrag = false; // on passe en mode drag&drop du grabber

		ctrl.wheel = wheel; // gestion de la roulette
		ctrl.mouseover = mouseover; 
		ctrl.mousemove = mousemove;
		ctrl.mouseout = mouseout;
		ctrl.mousedown = mousedown;
		ctrl.mouseup = mouseup;
		ctrl.click = click;

		function mousemove(event, ngelt) {
			if(!ctrl.ondrag) return;
			event.stopImmediatePropagation();
			event.stopPropagation();
			event.preventDefault();
			var m = getMousePosition(event);
			var rect = getRectArea(ngelt.get(0));
			var onePercent = rect.height / 100;
			var percentY = (m.y - rect.top) / onePercent;
			ctrl.posY = moveGrabber($timeout, $scope, ngelt, percentY);
			computeBeginFromPosY($scope, ctrl.posY);
		}
		function mousedown(event) {
			var elt = event.currentTarget;
			var ngelt = ng.element(elt);
			var m = getMousePosition(event);
			if (isInScrollbar(elt, m.x, m.y)) { // on a clicke dans scrollable
				if (isInGrabber(elt, m.x, m.y)) {
					ctrl.ondrag = true;
					console.log("start drag");
					ngelt.attr('drag', 'drag');
				}
			}
		}
		function mouseup(event, ngelt) {
			ngelt.attr('drag', null);
			ctrl.ondrag = false;
		}
		function mouseout(event) {
			var elt = event.currentTarget;
			ng.element(elt).attr('hover', null);
		}
		function mouseover(event) {
			var elt = event.currentTarget;
			var ngelt = ng.element(elt);
			var m = getMousePosition(event);
			ngelt.attr('hover', null);
			if (isInGrabber(elt, m.x, m.y)) {
				ngelt.attr('hover', 'hover');
			}
		}
		function click(event) {
			if(ctrl.ondrag) return;
			var elt = event.currentTarget;
			var ngelt = ng.element(elt);
			var rect = getRectArea(elt);
			var m = getMousePosition(event);
			if (isInScrollbar(elt, m.x, m.y)) { // on a clicke dans scrollable
				if (!isInGrabber(elt, m.x, m.y)) {
					var onePercent = rect.height / 100;
					var percentY = (m.y - rect.top) / onePercent;
					ctrl.posY = moveGrabber($timeout, $scope, ngelt, percentY);
					computeBeginFromPosY($scope, ctrl.posY);
				}
			}
		}
		function wheel(event) {
			manageWheelHandler(event);
			var elt = ng.element(event.currentTarget);
			computeY($scope, elt);
			var posY = ($scope.ngBegin * 100) / ($scope.total - $scope.ngLimit);
			ctrl.posY = moveGrabber($timeout, $scope, elt, posY);
		}
		function manageWheelHandler(event) {
			if (event.originalEvent.deltaY < 0) {
				moveWindowToUp();
			} else {
				moveWindowToDown();
			}
		}
		function moveWindowToUp() {
			if ($scope.ngBegin > 0) {
				$scope.ngBegin = Math.max($scope.ngBegin - SCROLLBY, 0);
			}
		}
		function moveWindowToDown() {
			if ($scope.ngBegin + $scope.ngLimit < $scope.total) {
				$scope.ngBegin = Math.min($scope.ngBegin + SCROLLBY, $scope.total - $scope.ngLimit);
			}
		}
		function isInScrollbar(elt, x, y) {
			var rect = getRectArea(elt);
			var element = document.elementFromPoint(x, y);
			return element === elt && x >= rect.x; // on est au dessus de la scrollbar

		}
		function isInGrabber(elt, x, y) {
			if (isInScrollbar(elt, x, y)) {
				var rect = getRectArea(elt);
				var start = rect.y + getGrabberOffset(rect.height, ctrl.sizeY, ctrl.posY);
				var end = start + getGrabberHeight(rect.height, ctrl.sizeY, ctrl.posY);
				return y >= start && y <= end;
			}
			return false;
		}
		function getRectArea(elt) {
			var rect = elt.getClientRects()[0];
			// zone de la scrollbar
			var w = $scope.width | 4;
			rect.x = rect.right - w;
			rect.y = rect.top;
			rect.left = rect.right - w;
			rect.width = w;
			return rect;
		}
	}
	var withTD = false;
	function computeLimit($timeout, scope, elt) {
		scope.ngBegin = 0;
		var htmlElt = elt.get(0);
		var rect = htmlElt.getClientRects()[0];
		var y = rect.bottom - 2;
		var x = rect.left + 2;
		var element = document.elementFromPoint(x, y);
		if (element === htmlElt) { // no TD
			if (!withTD) {
				if (scope.total > scope.ngLimit) {
					scope.ngLimit = scope.ngLimit + 1;
					withTD = false;
				}
			}
		} else { // TD
			scope.ngLimit = scope.ngLimit - 1;
			withTD = true;
		}
		computeY(scope, elt);
		var posY = (scope.ngBegin * 100) / (scope.total - scope.ngLimit);
		scope.ctrl.posY = moveGrabber($timeout, scope, elt, posY);
	}
	function computeBeginFromPosY(scope, posY) {
		scope.ngBegin = (posY * (scope.total - scope.ngLimit)) / 100;
	}
	function computeY(scope, elt) {
		scope.ctrl.sizeY = Math.min(Math.max((scope.ngLimit / scope.total) * 100, 2), 100);
		var w = scope.width | 4;
		var rect = elt.get(0).getClientRects()[0];
		elt.css({'background-size': w + 'px ' + getGrabberHeight(rect.height, scope.ctrl.sizeY, scope.ctrl.posY) + 'px'});
	}
	var scrollTimer = null;
	function moveGrabber($timeout, scope, elt, posY) {
		if (scrollTimer) {
			$timeout.cancel(scrollTimer);
		}
		scope.ctrl.onscroll = true;
		var grabberY = Math.max(posY, 0);
		var rect = elt.get(0).getClientRects()[0];
		elt.css({'background-position': 'right ' + getGrabberOffset(rect.height, scope.ctrl.sizeY, grabberY) + 'px'});
		scrollTimer = $timeout(function (c) {
			c.onscroll = false;
		}, scope.showInfoDelay || 1000, true, scope.ctrl);
		return grabberY;
	}
	/**
	 * Calcul la hauteur du grabber
	 * @param {type} height 
	 * @param {type} percentSize
	 * @param {type} percentPos
	 * @returns {Number}
	 */
	function getGrabberHeight(height, percentSize, percentPos) {
		return height * percentSize / (100 + percentSize);
	}
	/**
	 * Calcul la position y du grabber
	 * @param {type} height
	 * @param {type} percentSize
	 * @param {type} percentPos
	 * @returns {Number}
	 */
	function getGrabberOffset(height, percentSize, percentPos) {
		return height * percentPos / (100 + percentSize);
	}
	/**
	 * Position dela souris
	 * @param {type} event
	 * @returns {x,y}
	 */
	function getMousePosition(event) {
		return {x: event.clientX, y: event.clientY};
	}
})(angular);
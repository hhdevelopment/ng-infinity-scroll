require("./infinityscroll.css");
(function (ng) {
	var MODULENAME = 'infinity.scroll';
	var DIRECTIVENAME = 'infinityScroll';
	var NODENAME = 'INFINITY-SCROLL';
	var TAGNAME = 'infinity-scroll';
	var SCROLLBY = 3;
	'use strict';
	ng.module(MODULENAME, []).directive(DIRECTIVENAME, InfinityScroll);
	/* @ngInject */
	function InfinityScroll($timeout, $compile) {
		return {
			restrict: 'EA',
			controller: InfinityScrollCtrl,
			controllerAs: 'ctrl',
			scope: {
				'total': '<',
				'scrollbarSize': '@',
				'showInfoDelay': '<',
				'debounce': '<',
				'tagItems': '@',
				'height': '<',
				'ngBegin': '=',
				'ngLimit': '='
			}, link: function (scope, ngelt, attrs, ctrl) {
				var info = $compile("<span ng-show='ctrl.onscroll' class='infos-crolling' ng-bind='ctrl.getInfos()'></span>")(scope);
				ngelt.append(info);
				if (scope.height === undefined) {
					scope.height = 300;
				}
				ctrl.ngelt = ngelt; // on sauve l'element jquery
				ctrl.elt = ngelt.get ? ngelt.get(0) : ngelt[0]; // on sauve l'element
				ctrl.computeAreas(); // calcule les rectangles des zones 
				ctrl.defineInitialValues();
				var watcherClears = [];
				watcherClears.push(scope.$watch(function(scope) {
					return scope.ctrl.ngelt.css('display');
				}, function (v1, v2, s) {
					if(v1 !== 'none') {
						s.ctrl.updateHeight();
						$timeout(s.ctrl.updateLimit, s.debounce || 300, true);
					}
				}));
				watcherClears.push(scope.$watch('height', function (v1, v2, s) {
					s.ctrl.updateHeight();
				}));
				watcherClears.push(scope.$watch('total', function (v1, v2, s) {
					s.ctrl.updateTotal();
				}));
				watcherClears.push(scope.$watch('ngLimit', function (v1, v2, s) {
					$timeout(s.ctrl.updateLimit, s.debounce || 300, true);
				}));
				watcherClears.push(scope.$watch('ngBegin', function (v1, v2, s) {
					$timeout(s.ctrl.updateBegin, s.debounce || 300, true);
				}));
				scope.$on('$destroy', function () {
					watcherClears.forEach(function (watcherClear) {
						watcherClear();
					});
				});
				ctrl.addEventListeners();
			}
		};
	}
	function InfinityScrollCtrl($timeout, $scope) {
		var ctrl = this;
		ctrl.ngelt; // le composant lui meme
		ctrl.elt; // le composant lui meme
		ctrl.scrollbarArea = {}; // la zone de la scrollbar
		ctrl.area = {}; // la zone deu composant
		ctrl.getInfos = function () {
			return "[" + Math.ceil($scope.ngBegin + 1) + "-" + Math.ceil($scope.ngBegin + Math.min($scope.ngLimit, $scope.total)) + "]/" + $scope.total;
		};
		ctrl.cursorPos = 0; // position en % du curseur 
		ctrl.cursorSize = 100; // la taille en % du curseur
		ctrl.onscroll = false; // ca bouge, on affiche l'infobule

		ctrl.addEventListeners = addEventListeners; // gestion de la molette

		ctrl.computeAreas = computeAreas;
		ctrl.updateTotal = updateTotal;
		ctrl.updateLimit = updateLimit;
		ctrl.updateBegin = updateBegin;
		ctrl.updateHeight = updateHeight;
		ctrl.defineInitialValues = defineInitialValues;

		function addEventListeners() {
			ctrl.ngelt.bind("wheel", function (event) {
				$scope.$apply(function () {
					wheel(event);
				});
			});
			ctrl.ngelt.bind("click", function (event) {
				$scope.$apply(function () {
					click(event);
				});
			});
			ctrl.ngelt.bind("mouseout", function (event) {
				ctrl.ngelt.attr('hover', null); // fin du survol (eventuellement)
			});
			ctrl.ngelt.bind("mousedown", function (event) {
				$scope.$apply(function () {
					mousedown(event);
				});
			});
			ng.element(document).bind("mouseup", function (event) {
				ctrl.ngelt.attr('drag', null); // fin du mode drag&drop (eventuellement)
			});
			ng.element(document).bind("mousemove", function (event) {
				$scope.$apply(function () {
					mousemove(event);
				});
			});
		}
		/**
		 * Le nombre d'items a changer
		 */
		function updateTotal() {
			$scope.ngBegin = 0;
			ctrl.cursorPos = moveCursor(0);
			if (!$scope.total) {
				ctrl.cursorSize = computeHeightGrabber();
				return;
			}
			$scope.ngLimit = 1;
		}
		/**
		 * La limit a ete mis a jour
		 */
		function updateLimit() {
			if ($scope.ngLimit === 1) {
				initLimit();
			} else {
				adjustLimit();
			}
			ctrl.cursorSize = computeHeightGrabber();
			var cursorPos = ($scope.ngBegin * 100) / ($scope.total - $scope.ngLimit);
			ctrl.cursorPos = moveCursor(cursorPos);
		}
		/**
		 * begin a ete mis a jour
		 */
		function updateBegin() {
			added = false;
			adjustLimit();
		}
		/**
		 * 
		 */
		function defineInitialValues() {
			$scope.ngBegin = 0;
			$scope.ngLimit = $scope.ngLimit | 20;
		}
		/**
		 * La fenetre a ete redimentionn�
		 */
		var resizeTimer = null;
		function updateHeight() {
			ctrl.ngelt.css('height', $scope.height);
			if (resizeTimer) {
				$timeout.cancel(resizeTimer);
			}
			resizeTimer = $timeout(function (s) {
				invalidAreas();
				initLimit();
			}, 200, true, $scope);
		}
		function getArea() {
			if (!ctrl.area.height) {
				computeAreas();
			}
			return ctrl.area;
		}
		function getScrollbarArea() {
			if (!ctrl.scrollbarArea.height) {
				computeAreas();
			}
			return ctrl.scrollbarArea;
		}
		function invalidAreas() {
			ctrl.area = {x: 0, y: 0, left: 0, right: 0, width: 0, height: 0, top: 0, bottom: 0};
			ctrl.scrollbarArea = {x: 0, y: 0, left: 0, right: 0, width: 0, height: 0, top: 0, bottom: 0};
		}
		/**
		 * Calcul des aires
		 */
		function computeAreas() {
			var rect = ctrl.elt.getClientRects()[0];
			if (rect) {
				ctrl.area = rect;
				// zone de la scrollbar
				var bgSize = ctrl.ngelt.css('background-size');
				var w = parseInt(bgSize.replace(/px\s+\d+(\.\d+)*.*/, ''));
				ctrl.scrollbarArea = {
					x: rect.right - w, y: rect.top,
					left: rect.right - w, right: rect.right,
					width: w, height: rect.height,
					top: rect.top, bottom: rect.bottom
				};
			}
		}
		/**
		 * la souris bouge au dessus du composant
		 * @param {jqEvent} event
		 */
		function mousemove(event) {
			var m = getMousePosition(event);
			if (!isDragMode()) {
				ctrl.ngelt.attr('hover', null);
				if (isInGrabber(m.x, m.y)) { // la souris est au dessus du curseur
					event.stopImmediatePropagation();
					event.stopPropagation();
					event.preventDefault();
					ctrl.ngelt.attr('hover', 'hover');
				}
			} else { // on est en mode drag&drop
				event.stopImmediatePropagation();
				event.stopPropagation();
				event.preventDefault();
				var onePercent = getScrollbarArea().height / 100;
				var percentY = (m.y - getScrollbarArea().top) / onePercent;
				ctrl.cursorPos = moveCursor(percentY);
				computeBeginFromCursor(ctrl.cursorPos);
			}
		}
		function mousedown(event) {
			var m = getMousePosition(event);
			if (isInScrollbar(m.x, m.y)) { // on a click dans scrollable
				event.stopImmediatePropagation();
				event.stopPropagation();
				event.preventDefault();
				if (isInGrabber(m.x, m.y)) { // on a click sur le curseur
					ctrl.ngelt.attr('drag', 'drag');
				}
			}
		}
		function click(event) {
			if (isDragMode())
				return;
			var rect = getScrollbarArea();
			var m = getMousePosition(event);
			if (isInScrollbar(m.x, m.y)) { // on a clicke dans scrollable
				if (!isInGrabber(m.x, m.y)) {
					var onePercent = rect.height / 100;
					var percentY = (m.y - rect.top) / onePercent;
					ctrl.cursorPos = moveCursor(percentY);
					computeBeginFromCursor(ctrl.cursorPos);
				}
			}
		}
		function wheel(event) {
			manageWheelHandler(event);
			ctrl.cursorSize = computeHeightGrabber();
			var cursorPos = ($scope.ngBegin * 100) / ($scope.total - $scope.ngLimit);
			ctrl.cursorPos = moveCursor(cursorPos);
		}
		function manageWheelHandler(event) {
			if (event.originalEvent.deltaY < 0 && $scope.ngBegin > 0) {
				$scope.ngBegin = Math.max($scope.ngBegin - SCROLLBY, 0);
			} else if (event.originalEvent.deltaY >= 0 && $scope.ngBegin + $scope.ngLimit < $scope.total) {
				$scope.ngBegin = Math.min($scope.ngBegin + SCROLLBY, $scope.total - $scope.ngLimit);
			}
		}
		function isDragMode() {
			return ctrl.ngelt.attr('drag') === 'drag';
		}
		function isInScrollbar(x, y) {
			var element = document.elementFromPoint(x, y);
			return element === ctrl.elt && x >= getScrollbarArea().x; // on est au dessus de la scrollbar

		}
		function isInGrabber(x, y) {
			if (isInScrollbar(x, y)) {
				var start = getScrollbarArea().y + getGrabberOffset(ctrl.cursorSize, ctrl.cursorPos);
				var end = start + getGrabberHeight(ctrl.cursorSize);
				return y >= start && y <= end;
			}
			return false;
		}
		var added = false;
		function initLimit() {
			added = false;
			var items = ctrl.elt.getElementsByTagName(getTagItems());
			if (items.length) {
				var rects = items[items.length - 1].getClientRects();
				if (rects && rects.length) {
					var height = rects[0].height;
					$scope.ngLimit = Math.floor(getArea().height / height);
				}
			}
		}
		function adjustLimit() {
			if ($scope.total) {
				var element = document.elementFromPoint(getArea().left + 1, getArea().bottom - 1);
				if (!element) {
					return;
				}
				// on teste si l'element est enfant du composant
				if (element.nodeName !== NODENAME && !element.hasAttribute(TAGNAME) && ctrl.elt.contains(element)) { // item en bas du tableau
					$scope.ngLimit -= 1;
				} else if (!added) { // pas d'item
					added = true;
					var items = ctrl.elt.getElementsByTagName(getTagItems());
					if (items.length) {
						var height = [].reduce.call(items, function (accu, item) {
							return accu + item.getClientRects()[0].height;
						}, 0);
						var empty = getArea().height - height;
						var average = Math.floor(height / items.length);
						var inc = Math.floor(empty / average);
						$scope.ngLimit += inc;
					}
				}
			}
		}
		function computeHeightGrabber() {
			var heightGrabber = Math.min(Math.max(($scope.ngLimit / $scope.total) * 100, 2), 100);
			var bgSize = ctrl.ngelt.css('background-size');
			bgSize = bgSize.replace(/px\s+\d+(\.\d+)*.*/, 'px ' + getGrabberHeight(heightGrabber) + 'px');
			ctrl.ngelt.css({'background-size': bgSize});
			return heightGrabber;
		}
		var scrollTimer = null;
		function moveCursor(cursorPos) {
			if (scrollTimer) {
				$timeout.cancel(scrollTimer);
			}
			ctrl.onscroll = $scope.total;
			var grabberY = Math.min(Math.max(cursorPos, 0), 100);
			ctrl.ngelt.css({'background-position': 'right ' + getGrabberOffset(ctrl.cursorSize, grabberY) + 'px'});
			scrollTimer = $timeout(function (c) {
				c.onscroll = false;
			}, $scope.showInfoDelay || 1000, true, ctrl);
			return grabberY;
		}
		/**
		 * 
		 * @param {type} cursorPos : la position en % du curseur
		 */
		function computeBeginFromCursor(cursorPos) {
			var begin = (cursorPos * ($scope.total - $scope.ngLimit)) / 100;
			if ((begin + $scope.ngLimit) * 100 / $scope.total > 100) {
				begin = 100 - $scope.ngLimit * 100 / $scope.total;
			}
			$scope.ngBegin = begin;
		}
		/**
		 * Calcul la position y du curseur en px
		 * @param {type} percentSize
		 * @param {type} percentPos
		 * @returns {Number}
		 */
		function getGrabberOffset(percentSize, percentPos) {
			return getScrollbarArea().height * percentPos / (100 + percentSize);
		}
		/**
		 * Calcul la hauteur du grabber
		 * @param {type} percentSize
		 * @returns {Number}
		 */
		function getGrabberHeight(percentSize) {
			console.log("sb area", getScrollbarArea());
			return getScrollbarArea().height * percentSize / 100;
		}
		function getTagItems() {
			return $scope.tagItems || 'tr';
		}
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
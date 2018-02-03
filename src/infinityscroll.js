require("./infinityscroll.css");
(function (ng) {
	var MODULENAME = 'infinity.scroll';
	var DIRECTIVENAME = 'infinityScroll';
	var NODENAME = 'INFINITY-SCROLL';
	var TAGNAME = 'infinity-scroll';
	var DEBOUNCE = 200;
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
				'size': '<',
				'ngBegin': '=',
				'ngLimit': '='
			}, link: function (scope, ngelt, attrs, ctrl) {
				ctrl.ngelt = ngelt; // on sauve l'element jquery
				ctrl.elt = ngelt.get ? ngelt.get(0) : ngelt[0]; // on sauve l'element
				var info = $compile("<span ng-show='ctrl.onscroll' class='infos-crolling' ng-bind='ctrl.getInfos()'></span>")(scope);
				ngelt.append(info);
				if (scope.size === undefined) {
					scope.size = ctrl.isHorizontal() ? ngelt.width() : 300;
				}
				var attr = ctrl.ngelt.attr('scrollbar-size');
				if (!attr) {
					ctrl.ngelt.attr('scrollbar-size', 'md');
				}
				var pos = ctrl.ngelt.css('position');
				if (pos === 'static') {
					ctrl.ngelt.css('position', 'inherit');
				}
				ctrl.computeAreas(); // calcule les rectangles des zones 
				ctrl.defineInitialValues();
				var watcherClears = [];
				if (ngelt.css('display') === 'none') {
					watcherClears.push(scope.$watch(function (scope) {
						return scope.ctrl.ngelt.css('display');
					}, function (v1, v2, s) {
						if (v1 !== 'none') {
							s.ctrl.updateSize();
							s.ngLimit = 1;
						} else {
							s.ngLimit = 0;
						}
					}));
				}
				watcherClears.push(scope.$watch('size', function (v1, v2, s) {
					s.ctrl.updateSize();
				}));
				watcherClears.push(scope.$watch('total', function (v1, v2, s) {
					s.ctrl.updateTotal();
				}));
				watcherClears.push(scope.$watch('ngLimit', function (v1, v2, s) {
					$timeout(s.ctrl.updateLimit, s.debounce || DEBOUNCE, true);
				}));
				watcherClears.push(scope.$watch('ngBegin', function (v1, v2, s) {
					$timeout(s.ctrl.updateBegin, s.debounce || DEBOUNCE, true);
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
		ctrl.grabberOffsetPercent = 0; // position en % du curseur 
		ctrl.grabberSizePercent = 100; // la taille en % du curseur
		ctrl.onscroll = false; // ca bouge, on affiche l'infobule

		ctrl.addEventListeners = addEventListeners; // gestion de la molette
		ctrl.isHorizontal = isHorizontal;

		ctrl.computeAreas = computeAreas;
		ctrl.updateTotal = updateTotal;
		ctrl.updateLimit = updateLimit;
		ctrl.updateBegin = updateBegin;
		ctrl.updateSize = updateSize;
		ctrl.defineInitialValues = defineInitialValues;

		/**
		 * Ajoute tous les handlers
		 */
		function addEventListeners() {
			if (!isHorizontal()) { // seulement en mode vertical
				ctrl.ngelt.bind("wheel", function (event) {
					$scope.$apply(function () {
						wheel(event);
					});
				});
			}
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
			moveGrabber(0);
			if (!$scope.total) {
				computeAndUpdateGrabberSizes();
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
			computeAndUpdateGrabberSizes();
			moveGrabber(getGrabberOffsetPercentFromBeginAndLimit());
		}
		/**
		 * begin a ete mis a jour
		 */
		function updateBegin() {
			added = false;
			adjustLimit();
		}
		/**
		 * Définit les valeurs initial
		 */
		function defineInitialValues() {
			$scope.ngBegin = 0;
			$scope.ngLimit = 0;
		}
		/**
		 * La fenetre a ete redimentionn�
		 */
		var resizeTimer = null;
		function updateSize() {
			if (!isHorizontal()) {
				ctrl.ngelt.css('height', $scope.size);
			}
			if (resizeTimer) {
				$timeout.cancel(resizeTimer);
			}
			resizeTimer = $timeout(function (s) {
				invalidAreas();
				initLimit();
			}, 200, true, $scope);
		}
		function getArea() {
			if (isHorizontal() ? !ctrl.area.width : !ctrl.area.height) {
				computeAreas();
			}
			return ctrl.area;
		}
		function getScrollbarArea() {
			if (isHorizontal() ? !ctrl.scrollbarArea.width : !ctrl.scrollbarArea.height) {
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
				var s;
				if (isHorizontal()) { // on veut height
					s = parseInt(bgSize.match(/\D*\d+\D*(\d+)\D*/)[1]);
					ctrl.scrollbarArea = {
						x: rect.left, y: rect.bottom - s,
						left: rect.left, right: rect.right,
						width: rect.width, height: s,
						top: rect.bottom - s, bottom: rect.bottom
					};
				} else { // on veut width
					s = parseInt(bgSize.match(/\D*(\d+)\D*\d+\D*/)[1]);
					ctrl.scrollbarArea = {
						x: rect.right - s, y: rect.top,
						left: rect.right - s, right: rect.right,
						width: s, height: rect.height,
						top: rect.top, bottom: rect.bottom
					};
				}
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
				if (isGrabberOver(m.x, m.y)) { // la souris est au dessus du curseur
					event.stopImmediatePropagation();
					event.stopPropagation();
					event.preventDefault();
					ctrl.ngelt.attr('hover', 'hover');
				}
			} else { // on est en mode drag&drop
				event.stopImmediatePropagation();
				event.stopPropagation();
				event.preventDefault();
				moveGrabber(getGrabberOffsetPercentFromMousePosition(m));
				computeBeginFromCursor(ctrl.grabberOffsetPercent);
			}
		}
		function mousedown(event) {
			var m = getMousePosition(event);
			if (isScrollbarOver(m.x, m.y)) { // on a click dans scrollable
				event.stopImmediatePropagation();
				event.stopPropagation();
				event.preventDefault();
				if (isGrabberOver(m.x, m.y)) { // on a click sur le curseur
					ctrl.ngelt.attr('drag', 'drag');
				}
			}
		}
		function click(event) {
			if (isDragMode())
				return;
			var m = getMousePosition(event);
			if (isScrollbarOver(m.x, m.y)) { // on a clicke dans scrollable
				if (!isGrabberOver(m.x, m.y)) {
					moveGrabber(getGrabberOffsetPercentFromMousePosition(m));
					computeBeginFromCursor(ctrl.grabberOffsetPercent);
				}
			}
		}
		function wheel(event) {
			manageWheelHandler(event);
			computeAndUpdateGrabberSizes();
			moveGrabber(getGrabberOffsetPercentFromBeginAndLimit());
		}
		function manageWheelHandler(event) {
			if (event.originalEvent.deltaY < 0 && $scope.ngBegin > 0) {
				$scope.ngBegin = Math.max($scope.ngBegin - SCROLLBY, 0);
			} else if (event.originalEvent.deltaY >= 0 && $scope.ngBegin + $scope.ngLimit < $scope.total) {
				$scope.ngBegin = Math.min($scope.ngBegin + SCROLLBY, $scope.total - $scope.ngLimit);
			}
		}
		function getGrabberOffsetPercentFromBeginAndLimit() {
			var d = ($scope.ngLimit * 100) / $scope.total;
			return ($scope.ngBegin * (100 + d)) / $scope.total;
		}
		function getGrabberOffsetPercentFromMousePosition(m) {
			var grabberOffsetPercent;
			var rect = getScrollbarArea();
			var grabberOffsetPixel;
			var onePercent;
			if (isHorizontal()) {
				onePercent = rect.width / (100 + ctrl.grabberSizePercent);
				grabberOffsetPixel = m.x - rect.left;
			} else {
				onePercent = rect.height / (100 + ctrl.grabberSizePercent);
				grabberOffsetPixel = m.y - rect.top;
			}
			grabberOffsetPercent = grabberOffsetPixel / onePercent;
			return grabberOffsetPercent;
		}
		/**
		 * Est on en mode drag&drop
		 */
		function isDragMode() {
			return ctrl.ngelt.attr('drag') === 'drag';
		}
		/**
		 * La souris est elle au dessus de la scrollbar
		 * @param {type} x
		 * @param {type} y
		 * @returns {Boolean}
		 */
		function isScrollbarOver(x, y) {
			var result = false;
			var element = document.elementFromPoint(x, y);
			if (element && element === ctrl.elt) {
				if (isHorizontal()) {
					result = y >= getScrollbarArea().y; // on est au dessus de la scrollbar
				} else {
					result = x >= getScrollbarArea().x; // on est au dessus de la scrollbar
				}
			}
			return result;
		}
		/**
		 * La souris est elle au dessus du grabber
		 * @param {type} x
		 * @param {type} y
		 * @returns {Boolean}
		 */
		function isGrabberOver(x, y) {
			var result = false;
			if (isScrollbarOver(x, y)) {
				if (isHorizontal()) {
					var start = getScrollbarArea().x + getGrabberOffsetPixel(ctrl.grabberSizePercent, ctrl.grabberOffsetPercent);
					var end = start + getGrabberSizePixel(ctrl.grabberSizePercent);
					result = x >= start && x <= end;
				} else {
					var start = getScrollbarArea().y + getGrabberOffsetPixel(ctrl.grabberSizePercent, ctrl.grabberOffsetPercent);
					var end = start + getGrabberSizePixel(ctrl.grabberSizePercent);
					result = y >= start && y <= end;
				}
			}
			return result;
		}
		var added = false;
		function initLimit() {
			added = false;
			var items = ctrl.elt.getElementsByTagName(getTagItems());
			if (items.length) {
				var rects = items[items.length - 1].getClientRects();
				if (rects && rects.length) {
					if (isHorizontal()) {
						$scope.ngLimit = Math.floor(getArea().width / rects[0].width);
					} else {
						$scope.ngLimit = Math.floor(getArea().height / rects[0].height);
					}
				}
			}
		}
		function adjustLimit() {
			if ($scope.total) {
				var element;
				if (isHorizontal()) {
					element = document.elementFromPoint(getArea().right - 1, getArea().bottom - 1);
				} else {
					element = document.elementFromPoint(getArea().left + 1, getArea().bottom - 1);
				}
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
						var size = 0;
						var empty = 0;
						if (isHorizontal()) {
							size = [].reduce.call(items, function (accu, item) {
								return accu + item.getClientRects()[0].width;
							}, 0);
							empty = getArea().width - size;
						} else {
							size = [].reduce.call(items, function (accu, item) {
								return accu + item.getClientRects()[0].height;
							}, 0);
							empty = getArea().height - size;
						}
						var average = Math.floor(size / items.length);
						var inc = Math.floor(empty / average);
						$scope.ngLimit += inc;
					}
				}
			}
		}
		/**
		 * Calcul la taille du grabber 
		 */
		function computeAndUpdateGrabberSizes() {
			var grabberSizePercent = Math.min(Math.max(($scope.ngLimit / $scope.total) * 100, 2), 100);
			var bgSize = ctrl.ngelt.css('background-size');
			var grabbersizePixel = getGrabberSizePixel(grabberSizePercent);
			if (isHorizontal()) {
				bgSize = bgSize.replace(/.*\s+/, grabbersizePixel + 'px ');
			} else {
				bgSize = bgSize.replace(/px\s+\d+(\.\d+)*.*/, 'px ' + grabbersizePixel + 'px');
			}
			ctrl.ngelt.css({'background-size': bgSize});
			ctrl.grabberSizePercent = grabberSizePercent;
		}
		var scrollTimer = null;
		/**
		 * Corrige et déplace le curseur
		 * @param {number} percent
		 */
		function moveGrabber(percent) {
			if (scrollTimer) {
				$timeout.cancel(scrollTimer);
			}
			ctrl.onscroll = $scope.total;
			var grabberOffsetPercent = Math.min(Math.max(percent, 0), 100);
			var offset = getGrabberOffsetPixel(ctrl.grabberSizePercent, grabberOffsetPercent);
			if (isHorizontal()) {
				ctrl.ngelt.css({'background-position': offset + 'px bottom'});
			} else {
				ctrl.ngelt.css({'background-position': 'right ' + offset + 'px'});
			}
			scrollTimer = $timeout(function (c) {
				c.onscroll = false;
			}, $scope.showInfoDelay || 1000, true, ctrl);
			ctrl.grabberOffsetPercent = grabberOffsetPercent;
		}
		/**
		 * Calcul ngBegin à partir de la position du curseur
		 * @param {number} grabberOffsetPercent : la position en % du curseur
		 */
		function computeBeginFromCursor(grabberOffsetPercent) {
			var begin = (grabberOffsetPercent * ($scope.total - $scope.ngLimit)) / 100;
			if ((begin + $scope.ngLimit) * 100 / $scope.total > 100) {
				begin = 100 - $scope.ngLimit * 100 / $scope.total;
			}
			$scope.ngBegin = begin;
		}
		/**
		 * Calcul la position du curseur en px
		 * @param {type} percentSize
		 * @param {type} percentOffset
		 * @returns {Number}
		 */
		function getGrabberOffsetPixel(percentSize, percentOffset) {
			var sbLenght = isHorizontal() ? getScrollbarArea().width : getScrollbarArea().height; // Longueur de la scrollbar
			var grabberOffsetPixel = sbLenght * percentOffset / (100 + percentSize);
			return Math.max(grabberOffsetPixel, 0);
		}
		/**
		 * Calcul la hauteur du grabber
		 * @param {type} percentSize
		 * @returns {Number}
		 */
		function getGrabberSizePixel(percentSize) {
			if (isHorizontal()) {
				return getScrollbarArea().width * percentSize / 100;
			} else {
				return getScrollbarArea().height * percentSize / 100;
			}
		}
		/**
		 * Retourne le tag qui porte l'attribut ng-repeat 
		 * @returns {String}
		 */
		function getTagItems() {
			return $scope.tagItems || 'tr';
		}
		/**
		 * Le composant est il en mode horizontal
		 * @returns {boolean}
		 */
		var horizontal;
		function isHorizontal() {
			if (horizontal === undefined) {
				horizontal = ctrl.ngelt.hasClass('scroll-horizontal');
			}
			return horizontal;
		}
		/**
		 * Position de la souris
		 * @param {type} event
		 * @returns {x,y}
		 */
		function getMousePosition(event) {
			return {x: event.clientX, y: event.clientY};
		}
	}
})(angular);
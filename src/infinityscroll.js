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
	function InfinityScroll($timeout) {
		return {
			restrict: 'E',
			template: "<span ng-show='ctrl.onscroll' class='infos-crolling'>{{ctrl.getInfos()}}</span><ng-transclude></ng-transclude>",
			controller: InfinityScrollCtrl,
			controllerAs: 'ctrl',
			transclude: true,
			scope: {
				'total': '<',
				'scrollbarSize': '<',
				'showInfoDelay': '<',
				'debounce': '<',
				'tagItems': '@',
				'height': '<',
				'ngBegin': '=',
				'ngLimit': '='
			}, link: function (scope, ngelt, attrs) {
				ngelt.find('ng-transclude').css({'width': 'calc(100% - ' + (scope.scrollbarSize | 4) + 'px)'});
				if(scope.height === undefined) {
					scope.height = 300;
				}
				var ctrl = scope.ctrl;
				ctrl.ngelt = ngelt; // on sauve l'element jquery
				ctrl.computeAreas(); // calcule les rectangles des zones 
				ctrl.defineInitialValues();
				var watcherClears = [];
				watcherClears.push(scope.$watch('height', function (v1, v2, s) {
					s.ctrl.updateHeight();
				}, false));
				watcherClears.push(scope.$watch('total', function (v1, v2, s) {
					s.ctrl.updateTotal();
				}, false));
				watcherClears.push(scope.$watch('ngLimit', function (v1, v2, s) {
					$timeout(s.ctrl.updateLimit, s.debounce || 300, true);
				}, false));
				watcherClears.push(scope.$watch('ngBegin', function (v1, v2, s) {
					$timeout(s.ctrl.updateBegin, s.debounce || 300, true);
				}, false));
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
				computeAreas();
				initLimit();
			}, 200, true, $scope);
		}
		/**
		 * Calcul des aires
		 */
		function computeAreas() {
			var rect = ctrl.ngelt.get(0).getClientRects()[0];
			ctrl.area = rect;
			// zone de la scrollbar
			var w = $scope.scrollbarSize | 4;
			ctrl.scrollbarArea = {
				x: rect.right - w, y: rect.top,
				left: rect.right - w, right: rect.right,
				width: w, height: rect.height,
				top: rect.top, bottom: rect.bottom
			};
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
				var onePercent = ctrl.scrollbarArea.height / 100;
				var percentY = (m.y - ctrl.scrollbarArea.top) / onePercent;
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
			var rect = ctrl.scrollbarArea;
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
			var elt = ctrl.ngelt.get(0);
			var rect = ctrl.scrollbarArea;
			var element = document.elementFromPoint(x, y);
			return element === elt && x >= rect.x; // on est au dessus de la scrollbar

		}
		function isInGrabber(x, y) {
			if (isInScrollbar(x, y)) {
				var rect = ctrl.scrollbarArea;
				var start = rect.y + getGrabberOffset(ctrl.cursorSize, ctrl.cursorPos);
				var end = start + getGrabberHeight(ctrl.cursorSize);
				return y >= start && y <= end;
			}
			return false;
		}
		var added = false;
		function initLimit() {
			added = false;
			var items = ctrl.ngelt.get(0).getElementsByTagName(getTagItems());
			if (items.length) {
				var rects = items[items.length - 1].getClientRects();
				if (rects && rects.length) {
					var height = rects[0].height;
					$scope.ngLimit = Math.floor(ctrl.area.height / height);
				}
			}
		}
		function adjustLimit() {
			if ($scope.total) {
				var element = document.elementFromPoint(ctrl.area.left + 1, ctrl.area.bottom - 1);
				if (!element) {
					return;
				}
				// on teste si l'element est enfant du composant
				if (element.nodeName !== NODENAME && ctrl.ngelt.get(0).contains(element)) { // item en bas du tableau
					$scope.ngLimit -= 1;
				} else if(!added) { // pas d'item
					added = true;
					var items = ctrl.ngelt.get(0).getElementsByTagName(getTagItems());
					if (items.length) {
						var height = [].reduce.call(items, function (accu, item) {
							return accu + item.getClientRects()[0].height;
						}, 0);
						var empty = ctrl.area.height - height;
						var average = Math.floor(height / items.length);
						var inc = Math.floor(empty / average);
						$scope.ngLimit += inc;
					}
				}
			}
		}
		function computeHeightGrabber() {
			var heightGrabber = Math.min(Math.max(($scope.ngLimit / $scope.total) * 100, 2), 100);
			var w = $scope.scrollbarSize | 4;
			ctrl.ngelt.css({'background-size': w + 'px ' + getGrabberHeight(heightGrabber) + 'px'});
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
			return ctrl.scrollbarArea.height * percentPos / (100 + percentSize);
		}
		/**
		 * Calcul la hauteur du grabber
		 * @param {type} percentSize
		 * @returns {Number}
		 */
		function getGrabberHeight(percentSize) {
			return ctrl.scrollbarArea.height * percentSize / 100;
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
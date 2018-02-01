**ng-infinity-scroll**

ng-infinity-scroll is a directive for angular 1.x

it allows to use angular directive *limitTo* synchronized with a scrollbar.

It is very usefull to use thois directive when you try to show many row in the table for example.

Define size of your table in pixel and infinity-scroll compute pertinent limit and manage begin variables.


---

## Demo

https://jsfiddle.net/hhfrancois/frf5g8b6/27/embedded/
http://run.plnkr.co/preview/cjd55bod20006fill02kmypwj/

---

## Installation

Installation is easy with minimal dependencies - only the AngularJS and Jquery

#### Install with NPM

```sh
$ npm install ng-infinity-scroll
```

### Adding dependency to your project

When you are done downloading all the dependencies and project files the only remaining part is to add dependencies on the `infinity.scroll` AngularJS module:

```js
require('./node_modules/ng-infinity-scroll/dist/infinityscroll.js');
```

```js
angular.module('myModule', ['infinity.scroll']);
```

## Uses

### HTML

```html
<infinity-scroll scrollbar-size="12" show-info-delay="2000" total="ctrl.items.length" 
					ng-begin="begin" ng-limit="limit" height="ctrl.height"
					style="border:solid 1px black">
	<table class="table table-hover table-striped">
		<thead>
			<tr>
				<th style="width:30px">First</th>
				<th style="width:20px">2e</th>
				<th>Third</th>
				<th>Fourth</th>
				<th style="width:50px">Last</th>
				<th style="width:20px"></th>
			</tr>
		</thead>
		<tbody>
			<tr ng-repeat="item in ctrl.items| limitTo:limit:begin">
				<td ng-bind="item"></td><td><span class="glyphicon glyphicon-user"></span></td><td>Mark</td><td>Otto</td><td>@mdo</td><td><span class="glyphicon glyphicon-adjust"></span></td>
			</tr>
		</tbody>
	</table>
</infinity-scroll>
```

### Parameters

1. total (number) : The number of items
2. height (number) (optional) : height constraint of the ng-repeat element. Default value 300
3. ng-limit : the limit of window for directive limitTo. This value is managed this directive, don't set it
4. ng-begin : the begin of window  for directive limitTo. This value is managed this directive, don't set it
5. tag-items (string) (optional) : Define the tagname of node repeated by directive ng-repeat. Default value 'tr', without quote.
6. scrollbar-size (number) (optional) : Define the width of scrollbar. Default value 4 px
7. show-info-delay (number) (optional) : define the delay of time the infos about the window appears. Default value 1000 ms
8. debounce (number) (optional) : Set the delay before compute ng-limit. Default value 300 ms
**ng-infinity-scroll**

ng-infinity-scroll is a directive for angular 1.x

it allows to use angular directive *limitTo* synchronized with a scrollbar.

It is very usefull to use thois directive when you try to show many row in the table for example.

Define size of your table in pixel and infinity-scroll compute pertinent limit and manage begin variables.


---

## Demo

---

## Installation

Installation is easy with minimal dependencies - only the AngularJS

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

1. scrollbar-size : Define the width of scrollbar
2. show-info-delay : define the delay of time the infos about the window appears
3. total : The number of items
4. ng-limit : the limit of window for directive limitTo
5. ng-begin : the begin of window  for directive limitTo
6. height : height constraint of the ng-repeat element
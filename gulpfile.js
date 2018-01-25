var gulp = require('gulp'),
		  fs = require('fs'),
		  del = require('del'),
		  replace = require('gulp-replace');

gulp.task('default', ['clean', 'build']);

gulp.task('build', function () {
	var template = compact(fs.readFileSync('src/infinityscroll.html', 'utf8'));
	gulp.src('src/infinityscroll.css').pipe(gulp.dest('dist'));
	return gulp.src('src/infinityscroll.js')
			  .pipe(replace("require('./infinityscroll.html')", "\"" + template + "\""))
			  .pipe(gulp.dest('dist'));
});
function compact(src) {
	return src.toString().replace(/\n/g, "").replace(/\t+/g, " ").replace(/\"/g, "\\\"");
}
gulp.task('clean', function () {
	return del.sync(['dist/**/*']);
});

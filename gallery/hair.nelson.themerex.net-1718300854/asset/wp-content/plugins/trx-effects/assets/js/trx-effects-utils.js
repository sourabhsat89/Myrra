/**
 * JS utilities
 *
 * @since v1.0
 */

/* global jQuery:false */
/* global TRX_EFFECTS_STORAGE:false */

(function() {

	"use strict";


	/* Cookies manipulations
	---------------------------------------------------------------- */
	
	window.trx_effects_get_cookie = function(name) {
		var defa = arguments[1]!=undefined ? arguments[1] : null;
		var start = document.cookie.indexOf(name + '=');
		var len = start + name.length + 1;
		if ((!start) && (name != document.cookie.substring(0, name.length))) {
			return defa;
		}
		if (start == -1)
			return defa;
		var end = document.cookie.indexOf(';', len);
		if (end == -1)
			end = document.cookie.length;
		return unescape(document.cookie.substring(len, end));
	};
	
	
	window.trx_effects_set_cookie = function(name, value) {
		var expires = arguments[2]!=undefined ? arguments[2] : 0;
		var path    = arguments[3]!=undefined ? arguments[3] : '/';
		var domain  = arguments[4]!=undefined ? arguments[4] : '';
		var secure  = arguments[5]!=undefined ? arguments[5] : '';
		var today = new Date();
		today.setTime(today.getTime());
		if (expires) {
			expires = expires * 1000 * 60 * 60 * 24;
		}
		var expires_date = new Date(today.getTime() + (expires));
		document.cookie = name + '='
				+ escape(value)
				+ ((expires) ? ';expires=' + expires_date.toGMTString() : '')
				+ ((path)    ? ';path=' + path : '')
				+ ((domain)  ? ';domain=' + domain : '')
				+ ((secure)  ? ';secure' : '');
	};
	
	
	window.trx_effects_del_cookie = function(name) {
		var path   = arguments[1]!=undefined ? arguments[1] : '/';
		var domain = arguments[2]!=undefined ? arguments[2] : '';
		if (trx_effects_get_cookie(name))
			document.cookie = name + '=' + ((path) ? ';path=' + path : '')
					+ ((domain) ? ';domain=' + domain : '')
					+ ';expires=Thu, 01-Jan-1970 00:00:01 GMT';
	};
	
	
	
	/* Document manipulations
	---------------------------------------------------------------- */
	
	// Animated scroll to selected id
	window.trx_effects_document_animate_to = function(id, callback) {
		var oft = !isNaN(id) ? Number(id) : 0;
		if (isNaN(id)) {
			if (id.indexOf('#')==-1) id = '#' + id;
			var obj = jQuery(id).eq(0);
			if (obj.length === 0) return;
			oft = obj.offset().top;
		}
		var st  = jQuery(window).scrollTop();
		var oft2 = Math.max(0, oft - trx_effects_fixed_rows_height());
		var speed = Math.min(1200, Math.max(300, Math.round(Math.abs(oft2-st) / jQuery(window).height() * 300)));
		// Recalc offset always (after the half animation time) to detect change size of the fullheight rows
		if (true || st === 0) {
			setTimeout(function() {
				if (isNaN(id)) oft = obj.offset().top;
				oft2 = Math.max(0, oft - trx_effects_fixed_rows_height());
				jQuery('body,html').stop(true).animate( {scrollTop: oft2}, Math.floor(speed/2), 'linear', callback );
			}, Math.floor(speed/2));
		}
		jQuery('body,html').stop(true).animate( {scrollTop: oft2}, speed, 'linear', callback );
	};
	
	
	// Add/Change arguments to the url address
	window.trx_effects_add_to_url = function(loc, prm) {
		var ignore_empty = arguments[2] !== undefined ? arguments[2] : true;
		var q = loc.indexOf('?');
		var attr = {};
		var i;
		if (q > 0) {
			var qq = loc.substr(q+1).split('&');
			var parts = '';
			for (i=0; i < qq.length; i++) {
				parts = qq[i].split('=');
				attr[parts[0]] = parts.length>1 ? parts[1] : ''; 
			}
		}
		for (var p in prm) {
			attr[p] = prm[p];
		}
		loc = (q > 0 ? loc.substr(0, q) : loc) + '?';
		i = 0;
		for (p in attr) {
			if (ignore_empty && attr[p]==='') continue;
			loc += (i++ > 0 ? '&' : '') + p + '=' + attr[p];
		}
		return loc;
	};
	
	// Check if url is page-inner (local) link
	window.trx_effects_is_local_link = function(url) {
		var rez = url!==undefined;
		if (rez) {
			var url_pos = url.indexOf('#');
			if (url_pos === 0 && url.length == 1)
				rez = false;
			else {
				if (url_pos < 0) url_pos = url.length;
				var loc = window.location.href;
				var loc_pos = loc.indexOf('#');
				if (loc_pos > 0) loc = loc.substring(0, loc_pos);
				rez = url_pos===0;
				if (!rez) rez = loc == url.substring(0, url_pos);
			}
		}
		return rez;
	};
	
	// Get embed code from video URL
	window.trx_effects_get_embed_from_url = function(url, autoplay) {
		if (autoplay === undefined) {
			autoplay = true;
		}
		url = url.replace('/watch?v=', '/embed/')
				 .replace('/vimeo.com/', '/player.vimeo.com/video/');
		if (autoplay) {
			url += (url.indexOf('?') > 0 ? '&' : '?') + '&autoplay=1';
		}
		return '<iframe src="'+url+'" border="0" width="1280" height="720"></iframe>';
	};
			
	// Turn on autoplay for videos in the container
	window.trx_effects_set_autoplay = function(container, value) {
		if (value === undefined) value = 1;
		container.find('.video_frame > iframe, iframe').each(function () {
			var src = jQuery(this).attr('src');
			if (src === undefined) src = '';
			if (src.indexOf('youtube')>=0 || src.indexOf('vimeo')>=0) {
				jQuery(this).attr('src', trx_effects_add_to_url(src, {'autoplay': value}));
			}
		});
	};
	
	
	/* Browsers detection
	---------------------------------------------------------------- */
	
	window.trx_effects_browser_is_mobile = function() {
		var check = false;
		(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
		return check;
	};
	
	window.trx_effects_browser_is_ios = function() {
		return navigator.userAgent.match(/iPad|iPhone|iPod/i) != null || navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i)?true:false;
	};
	window.trx_effects_is_retina = function() {
		var mediaQuery = '(-webkit-min-device-pixel-ratio: 1.5), (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3/2), (min-resolution: 1.5dppx)';
		return (window.devicePixelRatio > 1) || (window.matchMedia && window.matchMedia(mediaQuery).matches);
	};
	
	
	/* File functions
	---------------------------------------------------------------- */
	
	window.trx_effects_get_file_name = function(path) {
		path = path.replace(/\\/g, '/');
		var pos = path.lastIndexOf('/');
		if (pos >= 0)
			path = path.substr(pos+1);
		return path;
	};
	
	window.trx_effects_get_file_ext = function(path) {
		var pos = path.lastIndexOf('.');
		path = pos >= 0 ? path.substr(pos+1) : '';
		return path;
	};
	
	window.trx_effects_get_basename = function(path) {
		return trx_effects_get_file_name(path).replace('.'+trx_effects_get_file_ext(path), '');
	};
	
	
	
	/* Image functions
	---------------------------------------------------------------- */
	
	// Return true, if all images in the specified container are loaded
	window.trx_effects_is_images_loaded = function(cont) {
		var complete = true;
		cont.find('img').each(function() {
			// If any of previous images is not loaded - skip rest
			if (!complete) return;
			var img = jQuery(this).get(0);
			// See if "naturalWidth" and "naturalHeight" properties are available
			if (typeof img.naturalWidth == 'number' && typeof img.naturalHeight == 'number')
				complete = !(this.naturalWidth == 0 && this.naturalHeight == 0);
			// See if "complete" property is available
			else if (typeof img.complete == 'boolean')
				complete = img.complete;
		});
		return complete;
	};
	
	// Call function when all images in the specified container are loaded
	window.trx_effects_when_images_loaded = function(cont, callback, max_delay) {
		if (max_delay === undefined) {
			var max_delay = 3000;
		}
		if (max_delay <= 0 || trx_effects_is_images_loaded(cont)) {
			callback();
		} else {
			setTimeout(function(){
				trx_effects_when_images_loaded(cont, callback, max_delay - 200);
			}, 200);
		}
	};
	
	
	/* Numbers functions
	---------------------------------------------------------------- */
	
	// Round number to specified precision. 
	// For example: num=1.12345, prec=2,  rounded=1.12
	//              num=12345,   prec=-2, rounded=12300
	window.trx_effects_round_number = function(num) {
		var precision = arguments[1]!==undefined ? arguments[1] : 0;
		var p = Math.pow(10, precision);
		return Math.round(num*p)/p;
	};
	
	// Format money:
	// For example: (123456789.12345).formatMoney(2, '.', ',');
	Number.prototype.formatMoney = function(c, d, t) {
		var n = this, 
			c = c == undefined ? 2 : (isNaN(c = Math.abs(c)) ? 2 : c),
			d = d == undefined ? "." : d, 
			t = t == undefined ? "," : t, 
			s = n < 0 ? "-" : "", 
			i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))), 
			j = (j = i.length) > 3 ? j % 3 : 0;
		return s
				+ (j ? i.substr(0, j) + t : "") 
				+ i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) 
				+ (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	};

	
	/* Strings
	---------------------------------------------------------------- */

	// Make first letter of every word
	window.trx_effects_proper = function(str) {
		return str.replace(/(\b\w)/gi, function(m) { return m.toUpperCase(); });
	};

	// Replicate string several times
	window.trx_effects_replicate = function(str, num) {
		var rez = '';
		for (var i=0; i < num; i++) {
			rez += str;
		}
		return rez;
	};

	// Check value for "on" | "off" | "inherit" values
	window.trx_effects_is_on = function(prm) {
		return prm>0 || ['true', 'on', 'yes', 'show'].indexOf((''+prm).toLowerCase()) >= 0;
	};
	window.trx_effects_is_off = function(prm) {
		return prm=='' || prm==0 || ['false', 'off', 'no', 'none', 'hide'].indexOf((''+prm).toLowerCase()) >= 0;
	};
	window.trx_effects_is_inherit = function(prm) {
		return ['inherit'].indexOf((''+prm).toLowerCase()) >= 0;
	};

		
	// Return icon class from classes string
	window.trx_effects_get_icon_class = function(classes) {
		var classes = classes.split(' ');
		var icon = '';
		for (var i=0; i < classes.length; i++) {
			if (classes[i].indexOf('icon-') >= 0) {
				icon = classes[i];
				break;
			}
		}
		return icon;
	};
	
	// Replace icon's class with new value
	window.trx_effects_chg_icon_class = function(classes, icon) {
		var chg = false;
		classes = classes.split(' ');
		for (var i=0; i < classes.length; i++) {
			if (classes[i].indexOf('icon-') >= 0) {
				classes[i] = icon;
				chg = true;
				break;
			}
		}
		if (!chg) {
			if (classes.length == 1 && classes[0] === '')
				classes[0] = icon;
			else
				classes.push(icon);
		}
		return classes.join(' ');
	};

	// Wrap each word to the specified tag
	window.trx_effects_wrap_words = function( txt, before, after ) {
		var rez = '', ch = '', in_tag = false, in_word = false;
		for (var i=0; i<txt.length; i++) {
			ch = txt.substr(i, 1);
			if ( ch == '<' ) {
				in_tag = true;
				if ( in_word ) {
					rez += after;
					in_word = false;
				}
			}
			if ( !in_tag ) {
				if ( ch == ' ' ) {
					if ( in_word ) {
						rez += after;
						in_word = false;
					}
				} else {
					if ( !in_word ) {
						rez += before;
						in_word = true;
					}
				}
			}
			rez += ch;
			if (ch == '>') {
				in_tag = false;
			}
		}
		return rez;
	};

	// Wrap each character to the specified tag
	window.trx_effects_wrap_chars = function( txt, before, after ) {
		var rez = '', ch = '', in_tag = false;
		for (var i=0; i<txt.length; i++) {
			ch = txt.substr(i, 1);
			if ( ch == '<' ) {
				in_tag = true;
			}
			rez += in_tag 
					? ch
					: before + (txt.substr(i, 1) == ' ' ? '&nbsp;' : txt.substr(i, 1)) + after;
			if (ch == '>') {
				in_tag = false;
			}
		}
		return rez;
	};

	
	
	/* Colors functions
	---------------------------------------------------------------- */
	
	window.trx_effects_hex2rgb = function(hex) {
		hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
		return {r: hex >> 16, g: (hex & 0x00FF00) >> 8, b: (hex & 0x0000FF)};
	};

	window.trx_effects_hex2rgba = function(hex, alpha) {
		var rgb = trx_effects_hex2rgb(hex);
		return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+alpha+')';
	};

	window.trx_effects_rgb2hex = function(color) {
		var aRGB;
		color = color.replace(/\s/g,"").toLowerCase();
		if (color=='rgba(0,0,0,0)' || color=='rgba(0%,0%,0%,0%)')
			color = 'transparent';
		if (color.indexOf('rgba(')==0)
			aRGB = color.match(/^rgba\((\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?)\)$/i);
		else	
			aRGB = color.match(/^rgb\((\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?)\)$/i);
		
		if(aRGB) {
			color = '';
			for (var i=1; i <= 3; i++) 
				color += Math.round((aRGB[i][aRGB[i].length-1]=="%"?2.55:1)*parseInt(aRGB[i])).toString(16).replace(/^(.)$/,'0$1');
		} else 
			color = color.replace(/^#?([\da-f])([\da-f])([\da-f])$/i, '$1$1$2$2$3$3');
		return (color.substr(0,1)!='#' ? '#' : '') + color;
	};
	
	window.trx_effects_components2hex = function(r,g,b) {
		return '#'+
			Number(r).toString(16).toUpperCase().replace(/^(.)$/,'0$1') +
			Number(g).toString(16).toUpperCase().replace(/^(.)$/,'0$1') +
			Number(b).toString(16).toUpperCase().replace(/^(.)$/,'0$1');
	};
	
	window.trx_effects_rgb2components = function(color) {
		color = trx_effects_rgb2hex(color);
		var matches = color.match(/^#?([\dabcdef]{2})([\dabcdef]{2})([\dabcdef]{2})$/i);
		if (!matches) return false;
		for (var i=1, rgb = new Array(3); i <= 3; i++)
			rgb[i-1] = parseInt(matches[i],16);
		return rgb;
	};
	
	window.trx_effects_hex2hsb = function(hex) {
		var h = arguments[1]!==undefined ? arguments[1] : 0;
		var s = arguments[2]!==undefined ? arguments[2] : 0;
		var b = arguments[3]!==undefined ? arguments[3] : 0;
		var hsb = trx_effects_rgb2hsb(trx_effects_hex2rgb(hex));
		hsb.h = Math.min(359, hsb.h + h);
		hsb.s = Math.min(100, hsb.s + s);
		hsb.b = Math.min(100, hsb.b + b);
		return hsb;
	};
	
	window.trx_effects_hsb2hex = function(hsb) {
		var rgb = trx_effects_hsb2rgb(hsb);
		return trx_effects_components2hex(rgb.r, rgb.g, rgb.b);
	};
	
	window.trx_effects_rgb2hsb = function(rgb) {
		var hsb = {};
		hsb.b = Math.max(Math.max(rgb.r,rgb.g),rgb.b);
		hsb.s = (hsb.b <= 0) ? 0 : Math.round(100*(hsb.b - Math.min(Math.min(rgb.r,rgb.g),rgb.b))/hsb.b);
		hsb.b = Math.round((hsb.b /255)*100);
		if ((rgb.r==rgb.g) && (rgb.g==rgb.b))  hsb.h = 0;
		else if (rgb.r>=rgb.g && rgb.g>=rgb.b) hsb.h = 60*(rgb.g-rgb.b)/(rgb.r-rgb.b);
		else if (rgb.g>=rgb.r && rgb.r>=rgb.b) hsb.h = 60  + 60*(rgb.g-rgb.r)/(rgb.g-rgb.b);
		else if (rgb.g>=rgb.b && rgb.b>=rgb.r) hsb.h = 120 + 60*(rgb.b-rgb.r)/(rgb.g-rgb.r);
		else if (rgb.b>=rgb.g && rgb.g>=rgb.r) hsb.h = 180 + 60*(rgb.b-rgb.g)/(rgb.b-rgb.r);
		else if (rgb.b>=rgb.r && rgb.r>=rgb.g) hsb.h = 240 + 60*(rgb.r-rgb.g)/(rgb.b-rgb.g);
		else if (rgb.r>=rgb.b && rgb.b>=rgb.g) hsb.h = 300 + 60*(rgb.r-rgb.b)/(rgb.r-rgb.g);
		else 								   hsb.h = 0;
		hsb.h = Math.round(hsb.h);
		return hsb;
	};
	
	window.trx_effects_hsb2rgb = function(hsb) {
		var rgb = {};
		var h = Math.round(hsb.h);
		var s = Math.round(hsb.s*255/100);
		var v = Math.round(hsb.b*255/100);
		if (s == 0) {
			rgb.r = rgb.g = rgb.b = v;
		} else {
			var t1 = v;
			var t2 = (255-s)*v/255;
			var t3 = (t1-t2)*(h%60)/60;
			if (h==360) h = 0;
			if (h<60) 		{ rgb.r=t1;	rgb.b=t2;   rgb.g=t2+t3; }
			else if (h<120) { rgb.g=t1; rgb.b=t2;	rgb.r=t1-t3; }
			else if (h<180) { rgb.g=t1; rgb.r=t2;	rgb.b=t2+t3; }
			else if (h<240) { rgb.b=t1; rgb.r=t2;	rgb.g=t1-t3; }
			else if (h<300) { rgb.b=t1; rgb.g=t2;	rgb.r=t2+t3; }
			else if (h<360) { rgb.r=t1; rgb.g=t2;	rgb.b=t1-t3; }
			else 			{ rgb.r=0;  rgb.g=0;	rgb.b=0;	 }
		}
		return { r:Math.round(rgb.r), g:Math.round(rgb.g), b:Math.round(rgb.b) };
	};
	
	
	
	/* ListBox and ComboBox manipulations
	---------------------------------------------------------------- */
	
	window.trx_effects_clear_listbox = function(box) {
		for (var i=box.options.length-1; i >= 0; i--)
			box.options[i] = null;
	};
	
	window.trx_effects_add_listbox_item = function(box, val, text) {
		var item = new Option();
		item.value = val;
		item.text = text;
		box.options.add(item);
	};
	
	window.trx_effects_del_listbox_item_by_value = function(box, val) {
		for (var i=0; i < box.options.length; i++) {
			if (box.options[i].value == val) {
				box.options[i] = null;
				break;
			}
		}
	};
	
	window.trx_effects_del_listbox_item_by_text = function(box, txt) {
		for (var i=0; i < box.options.length; i++) {
			if (box.options[i].text == txt) {
				box.options[i] = null;
				break;
			}
		}
	};
	
	window.trx_effects_find_listbox_item_by_value = function(box, val) {
		var idx = -1;
		for (var i=0; i < box.options.length; i++) {
			if (box.options[i].value == val) {
				idx = i;
				break;
			}
		}
		return idx;
	};
	
	window.trx_effects_find_listbox_item_by_text = function(box, txt) {
		var idx = -1;
		for (var i=0; i < box.options.length; i++) {
			if (box.options[i].text == txt) {
				idx = i;
				break;
			}
		}
		return idx;
	};
	
	window.trx_effects_select_listbox_item_by_value = function(box, val) {
		for (var i = 0; i < box.options.length; i++) {
			box.options[i].selected = (val == box.options[i].value);
		}
	};
	
	window.trx_effects_select_listbox_item_by_text = function(box, txt) {
		for (var i = 0; i < box.options.length; i++) {
			box.options[i].selected = (txt == box.options[i].text);
		}
	};
	
	window.trx_effects_get_listbox_values = function(box) {
		var delim = arguments[1] ? arguments[1] : ',';
		var str = '';
		for (var i=0; i < box.options.length; i++) {
			str += (str ? delim : '') + box.options[i].value;
		}
		return str;
	};
	
	window.trx_effects_get_listbox_texts = function(box) {
		var delim = arguments[1] ? arguments[1] : ',';
		var str = '';
		for (var i=0; i < box.options.length; i++) {
			str += (str ? delim : '') + box.options[i].text;
		}
		return str;
	};
	
	window.trx_effects_sort_listbox = function(box)  {
		var temp_opts = new Array();
		var temp = new Option();
		for(var i=0; i<box.options.length; i++)  {
			temp_opts[i] = box.options[i].clone();
		}
		for(var x=0; x<temp_opts.length-1; x++)  {
			for(var y=(x+1); y<temp_opts.length; y++)  {
				if(temp_opts[x].text > temp_opts[y].text)  {
					temp = temp_opts[x];
					temp_opts[x] = temp_opts[y];
					temp_opts[y] = temp;
				}  
			}  
		}
		for(i=0; i<box.options.length; i++)  {
			box.options[i] = temp_opts[i].clone();
		}
	};
	
	window.trx_effects_get_listbox_selected_index = function(box) {
		for (var i = 0; i < box.options.length; i++) {
			if (box.options[i].selected)
				return i;
		}
		return -1;
	};
	
	window.trx_effects_get_listbox_selected_value = function(box) {
		for (var i = 0; i < box.options.length; i++) {
			if (box.options[i].selected) {
				return box.options[i].value;
			}
		}
		return null;
	};
	
	window.trx_effects_get_listbox_selected_text = function(box) {
		for (var i = 0; i < box.options.length; i++) {
			if (box.options[i].selected) {
				return box.options[i].text;
			}
		}
		return null;
	};
	
	window.trx_effects_get_listbox_selected_option = function(box) {
		for (var i = 0; i < box.options.length; i++) {
			if (box.options[i].selected) {
				return box.options[i];
			}
		}
		return null;
	};
	
	
	
	/* Radio buttons manipulations
	---------------------------------------------------------------- */
	
	window.trx_effects_get_radio_value = function(radioGroupObj) {
		for (var i=0; i < radioGroupObj.length; i++) {
			if (radioGroupObj[i].checked) return radioGroupObj[i].value;
		}
		return null;
	};
	
	window.trx_effects_set_radio_checked_by_num = function(radioGroupObj, num) {
		for (var i=0; i < radioGroupObj.length; i++) {
			if (radioGroupObj[i].checked && i!=num) radioGroupObj[i].checked=false;
			else if (i==num) radioGroupObj[i].checked=true;
		}
	};
	
	window.trx_effects_set_radio_checked_by_value = function(radioGroupObj, val) {
		for (var i=0; i < radioGroupObj.length; i++) {
			if (radioGroupObj[i].checked && radioGroupObj[i].value!=val) radioGroupObj[i].checked=false;
			else if (radioGroupObj[i].value==val) radioGroupObj[i].checked=true;
		}
	};


	/* Timing functions
	---------------------------------------------------------------- */
	window.trx_effects_debounce = function(func, wait) {
		var timeout;
		return function () {
			var context = this, args = arguments;
			var later = function later() {
				timeout = null;
				func.apply(context, args);
			};
			var callNow = !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) {
				func.apply(context, args);
			}
		};
	};

	window.trx_effects_throttle = function(func, wait, debounce) {
		var timeout;
		return function () {
			var context = this, args = arguments;
			var throttler = function () {
				timeout = null;
				func.apply(context, args);
			};
			if (debounce) clearTimeout(timeout);
			if (debounce || !timeout) timeout = setTimeout(throttler, wait);
		};
	};



	/* Utils
	---------------------------------------------------------------- */
	
	// Merge two objects (arrays)
	window.trx_effects_array_merge = function(a1, a2) {
		for (var i in a2) a1[i] = a2[i];
		return a1;
	};

	// Generates a storable representation of a value
	window.trx_effects_serialize = function(mixed_val) {
		var obj_to_array = arguments.length==1 || argument[1]===true;
	
		switch ( typeof(mixed_val) ) {
	
			case "number":
				if ( isNaN(mixed_val) || !isFinite(mixed_val) )
					return false;
				else
					return (Math.floor(mixed_val) == mixed_val ? "i" : "d") + ":" + mixed_val + ";";
	
			case "string":
				return "s:" + mixed_val.length + ":\"" + mixed_val + "\";";
	
			case "boolean":
				return "b:" + (mixed_val ? "1" : "0") + ";";
	
			case "object":
				if (mixed_val === null) {
					return "N;";
				} else if (mixed_val instanceof Array) {
					var idxobj = { idx: -1 };
					var map = [];
					for (var i=0; i < mixed_val.length; i++) {
						idxobj.idx++;
						var ser = trx_effects_serialize(mixed_val[i]);
						if (ser)
							map.push(trx_effects_serialize(idxobj.idx) + ser);
					}                                      
					return "a:" + mixed_val.length + ":{" + map.join("") + "}";
				} else {
					var class_name = trx_effects_get_class(mixed_val);
					if (class_name == undefined)
						return false;
					var props = new Array();
					for (var prop in mixed_val) {
						var ser = trx_effects_serialize(mixed_val[prop]);
						if (ser)
							props.push(trx_effects_serialize(prop) + ser);
					}
					if (obj_to_array)
						return "a:" + props.length + ":{" + props.join("") + "}";
					else
						return "O:" + class_name.length + ":\"" + class_name + "\":" + props.length + ":{" + props.join("") + "}";
				}
	
			case "undefined":
				return "N;";
		}
		return false;
	};
	
	// Returns the name of the class of an object
	window.trx_effects_get_class = function(obj) {
		if (obj instanceof Object && !(obj instanceof Array) && !(obj instanceof Function) && obj.constructor) {
			var arr = obj.constructor.toString().match(/function\s*(\w+)/);
			if (arr && arr.length == 2) return arr[1];
		}
		return false;
	};

})();
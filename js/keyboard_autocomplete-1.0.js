/**
 * @version 1.0
 * @directions 按键精灵 for 研报审核后台 
 * @author Jqhan <jqhan@gemantic.cn>
 * @date 2011-10-21
 */
//使用方法
//$(function() {
//    var HttpParam = {
//        url : "http://info.gemantic.com:9085/prompt/list.do",
//        param : function(val) {
//            var data = {
//                'queryType' :  'theme',
//                'searchFrom':  'stock',
//                'count'     :  10,
//                'query'     :  val,
//            }
//            return data;
//        }
//    }
//    //配置
//    var configuration = {
//        
//        /**
//         * 解析请求成功后返回的responseData，解析返回结果中的数据。
//         * 如果为空，则默认为ResponseData数据。
//         * 可选项
//         * @param {Object} responseData Ajax请求服务器端的返回值 
//         * @return  需要后续方法中处理的内容，通常是一组数据列表
//         * 
//         * 
//         */
//        dealData : function(responseData) {         
//             return responseData.list;
//        },
//        
//        
//        
//        /**
//         * 下拉列表中用户看到的内容
//         * 
//         * @param {Object} dealData 
//         * @return  
//         */ 
//        listItemDisplay: function(dealData) {
//            return dealData.id + "   " + dealData.label;
//        },
//        
//        
//        /**
//         * 选中后Input框中显示的内容
//         * 可选项
//         * @param {Object} list
//         */ 
//        inputDisplay: function(dealData) {
//            return dealData.label;
//        },      
//        
//        //指定另一个节点，为它的value赋值原节点不能放下的内容
//        anotherValueBox : "#idBox",
//    
//        /**
//         * 
//         * 为anotherValueBox指定数据,可用于向服务器发送的内容。如使用键盘精灵选中“万科公司”，将anotherValue设置为万科的代码“000002”，再执行其它发送请求时不发送名称，而是发送代码。
//         * 可选项。
//         * @param {Object} list
//         */
//        anotherValue : function(list) {
//            return list.id;
//        },
//        
//        //宽度,可选
//        width: 152,
//        //击键后激活的延迟时间(单位毫秒)，默认400，可选
//        delay : 400,
//        //在触发前用户至少需要输入的字符数，默认为1，可选
//        minChars : 1,
//        //跨域与否，默认true跨域，可选
//        domain : true,
//    }
//    
//    $("#keyword").autokeyboard(HttpParam, configuration);
//})   

(function($) {
$.fn.extend({
	autokeyboard : function(HttpParam, configuration) {
		options = $.extend({}, $.Autocompleter.defaults, HttpParam, configuration);
		return this.each(function() {
			new $.Autocompleter(this, options);
		});
	},
	
});

$.Autocompleter = function(input, options) {
	var KEY = {
		UP : 38,
		DOWN : 40,
		DEL: 46,
		ESC : 27,
		TAB: 9,
		RETURN: 13,
	}
	var $input = $(input).attr("autocomplete", "off").addClass(options.inputClass);
	
	var timeout;
	var hasFocus = 0;
	var lastKeyPressCode;
	var config = {
			mouseDownOnSelect : false
	};
	var blockSubmit;
	var select = $.Autocompleter.Select(options, input, selectCurrent, config);
	
	$.browser.opera && $(input.form).bind("submit.autocomplete", function() {
		if (blockSubmit) {
			blockSubmit = false;
			return false;
		}
	});
	$input.bind(($.browser.opera ? "keypress" : "keydown") + ".autocomplete" ,function(event) {
		hasFocus = 1;
		lastKeyPressCode = event.keyCode;
		switch (lastKeyPressCode) {
		case KEY.UP: 
			event.preventDefault();
			if ( select.visible() ) {
				select.prev();
			} else {
				onChange();
			}
			break;
		case KEY.DOWN: 
			event.preventDefault();
			if ( select.visible() ) {
				select.next();
			} else {
				onChange();
			}
			break;
		case KEY.TAB:
		case KEY.RETURN:
			if( selectCurrent() ) {
				event.preventDefault();
				blockSubmit = true;
				return false;
			}
			break;
		case KEY.ESC: select.hide();
			break;
		default: 
			clearTimeout(timeout);
			timeout = setTimeout(onChange, options.delay);
			break;
		}
	}).focus(function(){
		hasFocus++;
	}).blur(function() {
		hasFocus = 0;
		if (!config.mouseDownOnSelect) {
			hideResults();
		}
	}).click(function() {
		if ( hasFocus++ > 1 && !select.visible() ) {
			onChange();
		}
	})
	
	//按键反应
	function onChange() {
		if (lastKeyPressCode == KEY.DEL) {
			select.hide();
			return;
		}
		
		var currentValue = $input.val();
		if (currentValue.length >= options.minChars) {
			$input.addClass(options.loadingClass);
			request(currentValue, receiveData, hideResultsNow);
		} else {
			stopLoading();
			select.hide();
		}
	}
	
	//发出请求
	function request(querydata, success, failure) {
		if((typeof options.url == "string") && (options.url.length > 0)) {
			if(options.domain) {
				$.jsonp({
					url : options.url,
					data : options.param(querydata),
					dataType: "jsonp",
					callbackParameter: "jsoncallback",
					success: function(data){
						var datas = eval('('+data+')');
						datas = options.dealData(datas)
						success(querydata, datas)
					}
				})
			} else {
				var datas = options.param(querydata);
				$.getJSON(options.url, datas, function(data) {
					var datas = options.dealData(data)
					success(querydata, datas)
				})
			}
			
		} else {
			select.emptyList();
			failure(query);
		}
		
	}
	
	//收到的数据
	function receiveData(query, data) {
		if ( data && data.length && hasFocus ) {
			hideResultsNow();
			stopLoading();
			select.display(data, query);
			select.show();
		} else {
			hideResultsNow();
		}
	};
	//当前选择
	function selectCurrent() {
		var selected = select.selected();
		if( !selected )
			return false;
		var result = selected.data("ac_data");
		var v;
		if(options.inputDisplay != null) {
			v = parse(result);
		} else {
			v = selected.html();
		}
		var anotherValueBox = options.anotherValueBox;
		var value = options.anotherValue(result)
		if (anotherValueBox != "")
			$(anotherValueBox).val(value);
		$input.val(v);
		hideResultsNow();
		return true;
	}
	function parse(data) {
		var result = options.inputDisplay(data);
		return result
	}
	//隐藏结果
	function hideResults() {
		clearTimeout(timeout);
		timeout = setTimeout(hideResultsNow, 200);
	};
	function hideResultsNow() {
		var wasVisible = select.visible();
		select.hide();
		clearTimeout(timeout);
		stopLoading();
	}
	//停止加载loading图标
	function stopLoading() {
		$input.removeClass(options.loadingClass);
	};
	
}
$.Autocompleter.Select = function (options, input, select, config) {
	var CLASSES = {
		ACTIVE: "ac_over"
	};
	
	var listItems,
		active = -1,
		data,
		term = "",
		needsInit = true,
		element,
		list;
	//初始化ul
	function init() {
		if (!needsInit)
			return;
		element = $("<div/>")
		.hide()
		.addClass(options.resultsClass)
		.css("position", "absolute")
		.appendTo(document.body);
		
		list = $("<ul/>").appendTo(element).mouseover( function(event) {
			if(target(event).nodeName && target(event).nodeName.toUpperCase() == 'LI') {
				active = $("li", list).removeClass(CLASSES.ACTIVE).index(target(event));
				$(target(event)).addClass(CLASSES.ACTIVE);  
			}
		}).click(function(event) {
			$(target(event)).addClass(CLASSES.ACTIVE);
			select();
			input.focus();
			return false;
		}).mousedown(function() {
			config.mouseDownOnSelect = true;
		}).mouseup(function() {
			config.mouseDownOnSelect = false;
		});
		
		if(options.width > 0) {
			element.css("width", options.width);
		}
		needsInit = false;
	}
	function target(event) {
		var element = event.target;
		while(element && element.tagName != "LI")
			element = element.parentNode;
		if(!element)
			return [];
		return element;
	}
	//上下移动
	function moveSelect(step) {
		listItems.slice(active, active + 1).removeClass(CLASSES.ACTIVE);
		movePosition(step);
        var activeItem = listItems.slice(active, active + 1).addClass(CLASSES.ACTIVE);
	};
	function movePosition(step) {
		active += step;
		if (active < 0) {
			active = listItems.size() - 1;
		} else if (active >= listItems.size()) {
			active = 0;
		}
	}
	//添入li内容
	function fillList() {
		list.empty();
		var max = data.length;
		for (var i=0; i < max; i++) {
			var formatted = options.listItemDisplay(data[i]);
			var li = $("<li/>").html(formatted).addClass(i%2 == 0 ? "ac_even" : "ac_odd").appendTo(list)[0];
			$.data(li, "ac_data", data[i]);
			
		}
		listItems = list.find("li");
	}
	
	return {
		display : function(d, q) {
			init();
			data = d;
			term = q;
			fillList();
		},
		next: function() {
			moveSelect(1);
		},
		prev: function() {
			moveSelect(-1);
		},
		show : function() {
			var offset = $(input).offset();
			element.css({
				width : typeof options.width == "string" || options.width > 0 ? options.width : $(input).width(),
				top : offset.top + input.offsetHeight,
				left : offset.left
			}).show();
		},
		visible : function() {
			return element && element.is(":visible");
		},
		hide: function() {
			element && element.hide();
			listItems && listItems.removeClass(CLASSES.ACTIVE);
			active = -1;
		},
		current: function() {
			return this.visible() && (listItems.filter("." + CLASSES.ACTIVE)[0] || options.selectFirst && listItems[0]);
		},
		selected: function() {
			var selected = listItems && listItems.filter("." + CLASSES.ACTIVE).removeClass(CLASSES.ACTIVE);
			return selected;
		},
		emptyList: function (){
			list && list.empty();
		},
		unbind: function() {
			element && element.remove();
		}
	}
}

//默认值
$.Autocompleter.defaults = {
	inputClass: "ac_input",
	resultsClass: "ac_results",
	loadingClass: "ac_loading",
	listItemDisplay : function(row) { return row[0]; },
	delay : 400,
	minChars : 1,
	width: 400,
	hideValue: "",
	domain : true,
	dealData : function(data) {return data; },
	anotherValueBox : "",
	anotherValue :function(list) {return list;},
}
})(jQuery)
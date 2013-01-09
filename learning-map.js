/**
 Learning Maps
 @author Rick Osborne <rosborne at fullsail dot com>
*/
;
(function(basePath){
    "use strict";
    // $.getScript(basePath + 'jquery.svg.js');
    // $.getScript(basePath + 'jquery.svgdom.js');
    window.setTimeout(function(){
        // console.log('loading css');
        if (document.createStyleSheet) {
            document.createStyleSheet(basePath + "learning-map.css");
        } else {
            $('<link rel="stylesheet" type="text/css" href="' + basePath + 'learning-map.css"/>').appendTo('head');
        }
    }, 1000);
})(document.location.hostname === 'localhost' ? '' : 'http://wddbs.com/fso/');
$(function(){
    "use strict";
    // constants, etc
    var catFromWord = { // english on the left, css class name on the right
        "know": "know",
        "show": "show", "watch": "show", "instruct": "show",
        "research": "research", "find": "research", "explore": "research",
        "build": "build", "create": "build", "make": "build",
        "beyond": "beyond", "additional": "beyond", "extra": "beyond"
    };
    var CONST = {
        ARROW_SPACE: 2, // how far away from the box does the arrow start?
        ARROW_INSET: 3, // for same-column arrows, how far left is the arrow?
        TAIL_ADJUST: 1.0 / 2.0 // split multiplier for multiple tails, 1/2 is no split
    };
    // You should not need to change anything after this line
    var englishTypes = [];
    for (var englishWord in catFromWord) {
        if (catFromWord.hasOwnProperty(englishWord)) {
            englishTypes.push(englishWord);
        }
    }
    var mapTypesRE = new RegExp("\\b(" + englishTypes.join("|") + ")\\b", "i");
    var whitespaceRE = /^\s*$/;
    var followsRE = /\s*\([^:]+\:\s*([^)]+)\)/;
    var trim = function(s) { return s.replace(/^\s+|\s+$/g, '').replace(/\s\s+/g, ' '); };
    var positionRelativeTo = function(anc, desc) {
        var ancOff = $(anc).offset();
        var descOff = $(desc).offset();
        return {
            top: descOff.top - ancOff.top,
            left: descOff.left - ancOff.left
        };
    };
    var highlightRelated = function() {
        var eliminate = '#' + this.id + ', .from-' + this.id + ', .to-' + this.id;
        $(this).parentsUntil('.learning-map-wrap').last().find('.map-item').not(eliminate).addClass('invert');
        $('polyline', $(this).parentsUntil('.learning-map-wrap').parent().find('.learning-map-svg').svg('get').root()).not(eliminate).addClass('invert');
    };
    var unhighlightRelated = function () {
        $(this).parentsUntil('.learning-map-wrap').last().find('.map-item').removeClass('invert');
        $('polyline', $(this).parentsUntil('.learning-map-wrap').parent().find('.learning-map-svg').svg('get').root()).removeClass('invert');
    };
    $('body').append('<div class="learning-map-canary"/>');
    var attemptCount = 0;
    var interval = window.setInterval(function(){
        attemptCount++;
        // console.log($('.learning-map-canary').css('display'));
        if ($('.learning-map-canary').css('display') == 'none') {
            window.clearInterval(interval);
            console.log('Building learning map');
            // Let's see if we can find a map with some deep, dark voodoo magic
            $(":header:contains('Learning Map') ~ ol").each(function(mapN,ol){
                var columnCount = $(ol).children('li').length;
                $(ol)
                    .addClass('learning-map')
                    .addClass('learning-map-col' + columnCount)
                    .wrap('<div class="learning-map-wrap" />')
                ;
                console.log("columnCount:", columnCount);
                var lines = [];
                var itemTitles = {};
                // top-level categories
                $(ol).children('li').each(function(setN,li) {
                    $(li).addClass('learning-map-set').addClass('learning-map-set' + setN);
                    var liText = $(li).contents().filter(function(){ return (this.nodeType == 3) && !this.textContent.match(whitespaceRE); });
                    if (liText.length) {
                        var setTitle = trim(liText[0].textContent);
                        var setMatch = mapTypesRE.exec(setTitle);
                        var setType = '';

                        if (setMatch && (setMatch.length > 0)) {
                            setType = catFromWord[setMatch[0].toLowerCase()];
                        } else {
                            setType = 'unknown';
                        }
                        setTitle = setTitle.replace(mapTypesRE, '<span class="map-set-word-' + setType + '">$1</span>');
                        $(liText).replaceWith(setTitle);
                        $(li)
                            .addClass('map-set-' + setType)
                            .children('ol, ul, dl')
                            .addClass('map-items')
                            .children('li, dt, dl')
                            .addClass('map-item')
                            .addClass('map-item-' + setType)
                            .attr('data-incoming', 0)
                            .attr('data-outgoing', 0)
                            // .bind('mouseenter', highlightRelated)
                            // .bind('mouseleave', unhighlightRelated)
                            .each(function(itemN,mi){
                                $(mi).addClass('map-item' + itemN);
                                if (!mi.id) {
                                    mi.id = "map" + mapN + "set" + setN + "item" + itemN;
                                }
                                var following = [];
                                // Try to use attributes and IDs first
                                var followsOneId = $(mi).attr('data-followsone');
                                if (followsOneId) {
                                    $.each(followsOneId.split(/\s+/), function(followN, followId) {
                                        var followed = document.getElementById(followId);
                                        if (followed) {
                                            following.push(followed);
                                        }
                                    });
                                }
                                // Try to use the prose
                                var itemText = trim($(mi).text());
                                var itemFollows = followsRE.exec(itemText);
                                if (itemFollows) {
                                    itemText = itemText.replace(followsRE, '');
                                    // try harder to make sure we're removing just text, not child nodes
                                    $(mi).contents(':contains("' + itemFollows[1] + '")').each(function(textN, textEl) {
                                        textEl.textContent = textEl.textContent.replace(followsRE, '');
                                    });
                                    $.each(itemFollows[1].split(/\s*[,;]\s*/), function(followN, followTitle) {
                                        followTitle = trim(followTitle).toLowerCase();
                                        if (itemTitles[followTitle]) {
                                            following.push(itemTitles[followTitle]);
                                        }
                                    });
                                    if ((setType == "research") && ($('a', mi).length === 0)) {
                                        $(mi).wrapInner('<a href="http://lmgtfy.com/?q=' + encodeURIComponent(itemText.toLowerCase()) + '" target="_blank" rel="external"/>');
                                    }
                                }
                                itemTitles[itemText.toLowerCase()] = mi;
                                var itemTextDelimAt = itemText.indexOf(':');
                                if (itemTextDelimAt >= 0) { // short titles
                                    itemTitles[itemText.substr(0,itemTextDelimAt).toLowerCase()] = mi;
                                }
                                var adjustPosition = function (target, newOffset) {
                                    var ps = $(target).prev('li, dt, dd');
                                    // console.log("adjust", $(target).text(), newOffset);
                                    newOffset += parseInt($(target).css('marginTop').replace('px',''), 10);
                                    if (ps.length) {
                                        newOffset += parseInt($(ps).css('marginBottom').replace('px',''), 10);
                                    }
                                    $(target).css('margin-top', newOffset + 'px');
                                };
                                $.each(following, function(followN, followed){
                                    // are they in different columns?
                                    $(mi).attr('data-follows', (followN > 0 ? $(mi).attr('data-follows') + ', ' : '') + '#' + followed.id);
                                    $(mi).addClass('from-' + followed.id);
                                    $(followed).attr('data-followed-by', ($(followed).attr('data-followed-by') ? $(followed).attr('data-followed-by') + ', ' : '') + '#' + mi.id);
                                    $(followed).addClass('to-' + mi.id);
                                    if (followed.parentElement != mi.parentElement) {
                                        $(mi).attr('data-incoming', 1 + parseInt($(mi).attr('data-incoming'), 10));
                                        $(followed).attr('data-outgoing', 1 + parseInt($(followed).attr('data-outgoing'), 10));
                                        var offset = positionRelativeTo(mi, followed);
                                        var afterIsFixed = $(mi).attr('data-fixed'),
                                            beforeIsFixed = $(followed).attr('data-fixed');
                                        if (!afterIsFixed) {
                                            $(mi).attr('data-fixed', true);
                                            var ps;
                                            if (offset.top === 0) {
                                                $(followed).attr('data-fixed', true);
                                            } else if (offset.top > 0) {
                                                // console.log($(followed).text(), " offsets ", $(mi).text());
                                                // $(mi).attr('data-fixed', true);
                                                // $(followed).attr('data-fixed', true);
                                                adjustPosition(mi, offset.top);
                                            } else if(!beforeIsFixed && (offset.top < 0) && (following.length == followN + 1)) {
                                                // try really hard to pack vertically
                                                var followedFollows = $(followed).attr('data-follows') || "",
                                                    toAdjust = followed,
                                                    keepDigging = true;
                                                $(followed).attr('data-fixed', true);
                                                // trace backwards for single-thread parents that we can pack tighter
                                                while (keepDigging) {
                                                    if ((followedFollows.length > 0) && (followedFollows.indexOf(',') < 0) && $(followedFollows).next('li, dt, dd').is(toAdjust) && !$(followedFollows).attr('data-fixed')) {
                                                        $(followedFollows).attr('data-fixed', true);
                                                        toAdjust = $(followedFollows)[0];
                                                        followedFollows = $(followedFollows).attr('data-follows') || "";
                                                    } else {
                                                        keepDigging = false;
                                                    }
                                                }
                                                // console.log($(mi).text(), " shifts ", $(toAdjust).text());
                                                // adjustPosition(toAdjust, 0 - offset.top);
                                            }
                                        }
                                    }
                                    lines.push({
                                        "type": "one",
                                        "from": followed,
                                        "to": mi
                                    });
                                });
                            })
                        ;
                    } // if we found text
                }); // each category
                if (lines.length) {
                    setTimeout(function(){
                        $('.learning-map-svg', ol).remove();
                        var svgWrap = $('<div class="learning-map-svg"></div>');
                        $(ol).parent().prepend(svgWrap);
                        var minWidth = $(ol).parent().width();
                        var minHeight = $(ol).parent().height();
                        if ($(ol).hasClass('one-sheet')) {
                            var columns = $(ol).children('li');
                            console.log("minHeight:", minHeight);
                            if (columns.length > 1) {
                                var c1off = positionRelativeTo(ol, columns[0]);
                                var c2off = positionRelativeTo(ol, columns[1]);
                                minWidth = Math.round(0.5 + Math.max(minWidth, (c2off.left - c1off.left) * columns.length));
                                $.each(columns, function(columnN, column) {
                                    minHeight = Math.max(minHeight, $(column).height());
                                    console.log("left", $(column).css('left'));
                                    $(column)
                                        .css('width', $(column).css('width'))
                                        .css('left', $(column).css('left'))
                                        .children('ol')
                                        .css('width', $(column).css('width'))
                                    ;
                                });
                                minHeight = Math.round(0.5 + minHeight);
                                console.log("minHeight:", minHeight);
                            }
                            // $(ol).width(minWidth);
                            $(ol).parent().height(minHeight).width(minWidth)
                                .parent().width(minWidth)
                                .parent().width(minWidth);
                        }
                        $(svgWrap).height(minHeight).width(minWidth);
                        /*
                        $(svgWrap).svg({
                            onLoad: function(svg) {
                                var defs = svg.defs();
                                var arrow = svg.marker(defs, 'arrow', 3, 2, 4, 4, 'auto', { 'markerUnits': "strokeWidth", fill: '#999999' });
                                svg.path(arrow, "M 0 0 L 4 2 L 0 4 z");
                                var linesLayer = svg.group({stroke: "#999999", strokeWidth: 1});
                                $.each(lines, function(lineN, line) {
                                    if (line.type === "one") {
                                        var fromPos = positionRelativeTo(ol, line.from),
                                            toPos = positionRelativeTo(ol, line.to),
                                            fromHeight = $(line.from).outerHeight(),
                                            toHeight = $(line.to).outerHeight(),
                                            fromWidth = $(line.from).outerWidth(),
                                            isPath = false,
                                            isAround = false,
                                            repeatOffset = 0,
                                            outgoingCount = parseInt($(line.from).attr('data-outgoing'), 10) || 1,
                                            incomingCount = parseInt($(line.to).attr('data-incoming'), 10) || 1,
                                            outgoingDrawn = parseInt($(line.from).attr('data-outgoing-drawn'), 10) || 0,
                                            incomingDrawn = parseInt($(line.to).attr('data-incoming-drawn'), 10) || 0,
                                            fromParent, fromSibling, gutterSplit, gutterWidth;
                                        if (fromPos.left == toPos.left) {
                                            $(line.from).attr('data-same-column', 1 + (parseInt($(line.from).attr('data-same-column'), 10) || 0));
                                            // same column
                                            fromPos.left += CONST.ARROW_INSET;
                                            toPos.left += CONST.ARROW_INSET;
                                            fromPos.top += fromHeight + CONST.ARROW_SPACE;
                                            toPos.top -= CONST.ARROW_SPACE;
                                            if (!$(line.to).prev('li, dt, dd').is(line.from)) {
                                                // later, not next
                                                isAround = true;
                                            }
                                        }
                                        else if(fromPos.top == toPos.top) {
                                            // different columns, same row
                                            $(line.from).attr('data-same-row', 1 + (parseInt($(line.from).attr('data-same-row'), 10) || 0));
                                            fromPos.left += fromWidth + CONST.ARROW_SPACE;
                                            toPos.left -= CONST.ARROW_SPACE;
                                            outgoingDrawn++;
                                            incomingDrawn++;
                                            fromPos.top += outgoingDrawn * fromHeight / (outgoingCount + 1);
                                            toPos.top = fromPos.top;
                                        }
                                        else {
                                            // different columns, different rows
                                            fromParent = ($(line.from).closest('.learning-map-set'))[0];
                                            fromSibling = ($(fromParent).next('.learning-map-set'))[0];
                                            gutterWidth = $(fromSibling).offset().left - $(fromParent).offset().left - fromWidth;
                                            gutterSplit = (fromSibling == $(line.to).closest('.learning-map-set')[0]) ? (2.0 / 3.0) : (1.0 / 3.0);
                                            // console.log('gw', gutterWidth);
                                            fromPos.left += fromWidth + CONST.ARROW_SPACE;
                                            toPos.left -= CONST.ARROW_SPACE;
                                            outgoingDrawn++;
                                            incomingDrawn++;
                                            var downAlready = (parseInt($(line.from).attr('data-down'), 10) || 0),
                                                upAlready = (parseInt($(line.from).attr('data-up'), 10) || 0),
                                                newFromTop = fromPos.top + outgoingDrawn * fromHeight / (outgoingCount + 1),
                                                newToTop = toPos.top + incomingDrawn * toHeight / (incomingCount + 1);
                                            if ((toPos.top > fromPos.top) && (fromPos.top + fromHeight > toPos.top)) {
                                                // down, overlapped
                                                newFromTop = toPos.top + Math.floor((fromPos.top + fromHeight - toPos.top) / 2);
                                                newToTop = newFromTop;
                                            }
                                            else if ((fromPos.top > toPos.top) && (toPos.top + toHeight > fromPos.top)) {
                                                // up, overlapped
                                            }
                                            else if (toPos.top > fromPos.top) {
                                                // down, no overlap
                                                repeatOffset = downAlready * CONST.ARROW_INSET;
                                                isPath = true;
                                                downAlready++;
                                            }
                                            else {
                                                // up, no overlap
                                                repeatOffset = upAlready * CONST.ARROW_INSET;
                                                isPath = true;
                                                upAlready++;
                                            }
                                            $(line.from).attr('data-down', downAlready);
                                            $(line.from).attr('data-up', upAlready);
                                            fromPos.top = newFromTop;
                                            toPos.top = newToTop;
                                        }
                                        $(line.from).attr('data-outgoing-drawn', outgoingDrawn);
                                        $(line.to).attr('data-incoming-drawn', incomingDrawn);
                                        var linePoints = [
                                                [fromPos.left, fromPos.top],
                                                [toPos.left, toPos.top]
                                            ];
                                        if ((fromPos.top != toPos.top) && (fromPos.left != toPos.left)) {
                                            // is a path
                                            // var midX = Math.floor((toPos.left + fromPos.left) / 2) - repeatOffset;
                                            var midX = Math.floor(fromPos.left + (gutterWidth * gutterSplit));
                                            linePoints.splice(1, 0,
                                                [midX - CONST.ARROW_INSET, fromPos.top],
                                                [midX, fromPos.top + ((toPos.top < fromPos.top ? -1.0 : 1.0) * CONST.ARROW_INSET) ],
                                                [midX, toPos.top - ((toPos.top < fromPos.top ? -1.0 : 1.0) * CONST.ARROW_INSET) ],
                                                [midX + CONST.ARROW_INSET, toPos.top]
                                            );
                                        }
                                        else if (isAround) {
                                            var outset = 3 * CONST.ARROW_INSET;
                                            linePoints.splice(1, 0, [fromPos.left - outset, fromPos.top + outset], [toPos.left - outset, toPos.top - outset]);
                                        }
                                        svg.polyline(linesLayer, linePoints, { 'fill': "none", "marker-end": "url(#arrow)", 'class': 'from-' + line.from.id + ' to-' + line.to.id });
                                    }
                                    // try to prevent reference counting issues
                                    line.from = null;
                                    line.to = null;
                                }); // each line
                            } // onLoad
                        }); // svg attach
                        */
                    },1);
                }
            }); // each map
        } else if (attemptCount > 20) {
            window.clearInterval(interval);
            console.log('Abandoning learning map');
        }
    }, 250); // setInterval
}); // on ready
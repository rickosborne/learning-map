/**
 Learning Maps
 @author Rick Osborne <rosborne at fullsail dot com>
*/
$(function(){
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
        TAIL_ADJUST: 1.0 / 4.0 // split multiplier for multiple tails, 1/2 is no split
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
    var trim = function(s) { return s.replace(/^\s+|\s+$/g, '').replace(/\s\s+/g, ' '); }
    var positionRelativeTo = function(anc, desc) {
        var ancOff = $(anc).offset();
        var descOff = $(desc).offset();
        return {
            top: descOff.top - ancOff.top,
            left: descOff.left - ancOff.left
        };
    };
    // Let's see if we can find a map with some deep, dark voodoo magic
    $(":header:contains('Learning Map') ~ ol").each(function(olN,ol){
        $(ol)
            .addClass('learning-map')
            .addClass('learning-map-col' + $(ol).children('li').length)
            .wrap('<div class="learning-map-wrap" />')
        ;
        var lines = [];
        var itemTitles = {};
        // top-level categories
        $(ol).children('li').each(function(liN,li) {
            $(li).addClass('learning-map-set').addClass('learning-map-set' + liN);
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
                $(li)
                    .addClass('map-set-' + setType)
                    .children('ol, ul, dl')
                    .children('li, dt, dd')
                    .addClass('map-item-' + setType)
                ;
                setTitle = setTitle.replace(mapTypesRE, '<span class="map-set-word-' + setType + '">$1</span>');
                $(liText).replaceWith(setTitle);
                $(li)
                    .children('ol, ul, dl')
                    .addClass('map-items')
                    .children('li, dt, dl')
                    .addClass('map-item')
                    .each(function(miN,mi){
                        $(mi).addClass('map-item' + miN);
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
                            if ((setType == "research") && ($('a', mi).length == 0)) {
                                $(mi).wrapInner('<a href="http://lmgtfy.com/?q=' + encodeURIComponent(itemText.toLowerCase()) + '" target="_blank" rel="external"/>');
                            }
                        }
                        itemTitles[itemText.toLowerCase()] = mi;
                        var adjustPosition = function (target, newOffset) {
                            var ps = $(target).prev('li, dt, dd');
                            newOffset += parseInt($(target).css('marginTop').replace('px',''));
                            if (ps.length) {
                                newOffset += parseInt($(ps).css('marginBottom').replace('px',''));
                            }
                            $(target).css('margin-top', newOffset + 'px');
                        };
                        $.each(following, function(followN, followed){
                            // are they in different columns?
                            if (followed.parentElement != mi.parentElement) {
                                var offset = positionRelativeTo(mi, followed);
                                var afterIsFixed = $(mi).attr('data-fixed'),
                                    beforeIsFixed = $(followed).attr('data-fixed');
                                if (!afterIsFixed) {
                                    $(mi).attr('data-fixed', true);
                                    var ps;
                                    if (offset.top > 0) {
                                        adjustPosition(mi, offset.top);
                                    } else if(!beforeIsFixed && (offset.top < 0) && (following.length == followN + 1)) {
                                        console.log("back-adjusting " + $(followed).text() + offset.top);
                                        $(followed).attr('data-fixed', true);
                                        adjustPosition(followed, 0 - offset.top);
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
            $('.learning-map-svg', ol).remove();
            var svgWrap = $('<div class="learning-map-svg"></div>');
            $(ol).parent().prepend(svgWrap);
            $(svgWrap).height($(ol).height())
            $(svgWrap).svg({
                onLoad: function(svg) {
                    var defs = svg.defs();
                    var arrow = svg.marker(defs, 'arrow', 3, 2, 4, 4, 'auto', { 'markerUnits': "strokeWidth", fill: '#999999' });
                    svg.path(arrow, "M 0 0 L 4 2 L 0 4 z");
                    var linesLayer = svg.group({stroke: "#999999", strokeWidth: 1});
                    $.each(lines, function(lineN, line) {
                        if (line.type === "one") {
                            var fromPos = positionRelativeTo(ol, line.from);
                            var toPos = positionRelativeTo(ol, line.to);
                            var fromHeight = $(line.from).outerHeight();
                            var toHeight = $(line.to).outerHeight();
                            var fromWidth = $(line.from).outerWidth();
                            var isPath = false;
                            if (fromPos.left == toPos.left) {
                                // same column
                                fromPos.left += CONST.ARROW_INSET;
                                toPos.left += CONST.ARROW_INSET;
                                fromPos.top += fromHeight + CONST.ARROW_SPACE;
                                toPos.top -= CONST.ARROW_SPACE;
                            }
                            else if(fromPos.top == toPos.top) {
                                // different columns
                                fromPos.top += Math.floor(Math.min(fromHeight, toHeight) / 2);
                                toPos.top = fromPos.top;
                                fromPos.left += fromWidth + CONST.ARROW_SPACE;
                                toPos.left -= CONST.ARROW_SPACE;
                            }
                            else {
                                fromPos.left += fromWidth + CONST.ARROW_SPACE;
                                toPos.left -= CONST.ARROW_SPACE;
                                if ((toPos.top > fromPos.top) && (fromPos.top + fromHeight > toPos.top)) {
                                    fromPos.top = toPos.top + Math.floor((fromPos.top + fromHeight - toPos.top) / 2);
                                    toPos.top = fromPos.top;
                                }
                                else if ((fromPos.top > toPos.top) && (toPos.top + toHeight > fromPos.top)) {
                                    fromPos.top = fromPos.top + Math.floor((toPos.top + toHeight - fromPos.top) / 2)
                                }
                                else if (toPos.top > fromPos.top) {
                                    toPos.top += Math.floor(toHeight * CONST.TAIL_ADJUST);
                                    fromPos.top += Math.floor(fromHeight * (1 - CONST.TAIL_ADJUST));
                                    isPath = true;
                                }
                                else if (fromPos.top > toPos.top) {
                                    fromPos.top += Math.floor(fromHeight * CONST.TAIL_ADJUST);
                                    toPos.top += Math.floor(toHeight * (1 - CONST.TAIL_ADJUST));
                                    isPath = true;
                                }
                                else {
                                    fromPos.top += Math.floor(fromHeight * CONST.TAIL_ADJUST);
                                    toPos.top += Math.floor(toHeight * (1 - CONST.TAIL_ADJUST));
                                    isPath = true;
                                }
                            }
                            if (isPath) {
                                var midX = Math.floor((toPos.left + fromPos.left) / 2);
                                svg.polyline(linesLayer, [
                                    [fromPos.left, fromPos.top],
                                    [midX, fromPos.top],
                                    [midX, toPos.top],
                                    [toPos.left, toPos.top]
                                ], { fill: "none", "marker-end": "url(#arrow)"});
                            }
                            else {
                                svg.line(linesLayer, fromPos.left, fromPos.top, toPos.left, toPos.top, { "marker-end": "url(#arrow)"});
                            }
                        }
                        // try to prevent reference counting issues
                        line.from = null;
                        line.to = null;
                    }); // each line
                } // onLoad
            }); // svg attach
        }
    }); // each map
}); // on ready
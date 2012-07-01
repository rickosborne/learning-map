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
    // You should not need to change anything after this line
    var englishTypes = [];
    for (var englishWord in catFromWord) {
        if (catFromWord.hasOwnProperty(englishWord)) {
            englishTypes.push(englishWord);
        }
    }
    var mapTypesRE = new RegExp("\\b(" + englishTypes.join("|") + ")\\b", "i");
    var whitespaceRE = /^\s*$/;
    var trim = function(s) { return s.replace(/^\s+|\s+$/g, ''); }
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
        // top-level categories
        $(ol).children('li').each(function(liN,li) {
            $(li).addClass('learning-map-set').addClass('learning-map-set' + liN);
            var liText = $(li).contents().filter(function(){ return (this.nodeType == 3) && !this.textContent.match(whitespaceRE); });
            if (liText.length) {
                var setTitle = trim(liText[0].textContent);
                var setMatch = mapTypesRE.exec(setTitle);
                var setType = '';
                if (setMatch.length > 0) {
                    setType = catFromWord[setMatch[0].toLowerCase()];
                    $(li)
                        .addClass('map-set-' + setType)
                        .children('ol, ul')
                        .children('li')
                        .addClass('map-item-' + setType)
                    ;
                    setTitle = setTitle.replace(mapTypesRE, '<span class="map-set-word-' + setType + '">$1</span>');
                    $(liText).replaceWith(setTitle);
                }
                $(li)
                    .children('ol, ul')
                    .addClass('map-items')
                    .children('li')
                    .addClass('map-item')
                    .each(function(miN,mi){
                        $(mi)
                            .addClass('map-item' + miN)
                            // .wrap('<a href="#" />')
                        ;
                        var followsOneId = $(mi).attr('data-followsone');
                        if (followsOneId) {
                            $.each(followsOneId.split(/\s+/), function(followN, followsOneId){
                                var followed = $('#' + followsOneId);
                                if (followed.length == 1) {
                                    followed = followed[0];
                                    // are they in the different columns?
                                    if (followed.parentElement != mi.parentElement) {
                                        var offset = positionRelativeTo(mi, followed);
                                        var fixed = $(mi).attr('data-fixed');
                                        $(mi).attr('data-fixed', true);
                                        if (!fixed && (offset.top > 0)) {
                                            var ps = $(mi).prev('li');
                                            offset.top += parseInt($(mi).css('marginTop').replace('px',''));
                                            if (ps.length) {
                                                offset.top += parseInt($(ps).css('marginBottom').replace('px',''));
                                            }
                                            $(mi).css('margin-top', offset.top + 'px');
                                        }
                                    }
                                    lines.push({
                                        "type": "one",
                                        "from": followed,
                                        "to": mi
                                    });
                                }
                            });
                        }
                    })
                ;
            } // if we found text
        }); // each category
        if (lines.length) {
            console.log(lines);
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
                        console.log(line);
                        if (line.type === "one") {
                            var fromPos = positionRelativeTo(ol, line.from);
                            var toPos = positionRelativeTo(ol, line.to);
                            var fromHeight = $(line.from).outerHeight();
                            var toHeight = $(line.to).outerHeight();
                            var fromWidth = $(line.from).outerWidth();
                            var isPath = false;
                            if (fromPos.left == toPos.left) {
                                // same column
                                fromPos.left += 3;
                                toPos.left += 3;
                                fromPos.top += 2 + fromHeight;
                                toPos.top -= 2;
                            }
                            else if(fromPos.top == toPos.top) {
                                // different columns
                                fromPos.top += Math.floor(Math.min(fromHeight, toHeight) / 2);
                                toPos.top = fromPos.top;
                                fromPos.left += 2 + fromWidth;
                                toPos.left -= 2;
                            }
                            else {
                                fromPos.left += 2 + fromWidth;
                                toPos.left -= 2;
                                if ((toPos.top > fromPos.top) && (fromPos.top + fromHeight > toPos.top)) {
                                    fromPos.top = toPos.top + Math.floor((fromPos.top + fromHeight - toPos.top) / 2);
                                    toPos.top = fromPos.top;
                                }
                                else if ((fromPos.top > toPos.top) && (toPos.top + toHeight > fromPos.top)) {
                                    fromPos.top = fromPos.top + Math.floor((toPos.top + toHeight - fromPos.top) / 2)
                                }
                                else if (toPos.top > fromPos.top) {
                                    toPos.top += Math.floor(toHeight / 3);
                                    fromPos.top += Math.floor(2.0 * fromHeight / 3);
                                    isPath = true;
                                }
                                else if (fromPos.top > toPos.top) {
                                    fromPos.top += Math.floor(fromHeight / 3);
                                    toPos.top += Math.floor(2.0 * toHeight / 3);
                                    isPath = true;
                                }
                                else {
                                    fromPos.top += Math.floor(fromHeight / 2);
                                    toPos.top += Math.floor(toHeight / 2);
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
                    });
                } // onLoad
            }); // svg attach
        }
    }); // each map
}); // on ready
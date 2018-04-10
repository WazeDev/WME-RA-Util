// ==UserScript==
// @name         WME RA Util
// @namespace    https://greasyfork.org/users/30701-justins83-waze
// @version      2018.04.10.02
// @description  Providing basic utility for RA adjustment without the need to delete & recreate
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/*
// @exclude      https://www.waze.com/user/editor*
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @author       JustinS83
// @grant        none
// @license      GPLv3
// ==/UserScript==

/* global W */
/* global WazeWrap */

/*
Todo:
-diameter change

non-normal RA color:#FF8000
normal RA color:#4cc600
*/
(function() {

    var RAUtilWindow = null;
    var UpdateSegmentGeometry;
    var MoveNode, MultiAction;
    var drc_layer;

    //var totalActions = 0;
    var _settings;

    function bootstrap(tries) {
        tries = tries || 1;

        if (window.W &&
            window.W.map &&
            window.W.model &&
            window.require &&
            WazeWrap) {

            init();

        } else if (tries < 1000) {
            setTimeout(function () {bootstrap(tries++);}, 200);
        }
    }

    bootstrap();


    function init(){
        UpdateSegmentGeometry = require('Waze/Action/UpdateSegmentGeometry');
        MoveNode = require("Waze/Action/MoveNode");
        MultiAction = require("Waze/Action/MultiAction");

        RAUtilWindow = document.createElement('div');
        RAUtilWindow.id = "RAUtilWindow";
        RAUtilWindow.style.position = 'fixed';
        RAUtilWindow.style.visibility = 'hidden';
        RAUtilWindow.style.top = '15%';
        RAUtilWindow.style.left = '25%';
        RAUtilWindow.style.width = 'auto'; //390px
        RAUtilWindow.style.zIndex = 100;
        RAUtilWindow.style.backgroundColor = '#BEDCE5';
        RAUtilWindow.style.borderWidth = '3px';
        RAUtilWindow.style.borderStyle = 'solid';
        RAUtilWindow.style.borderRadius = '10px';
        RAUtilWindow.style.boxShadow = '5px 5px 10px Silver';
        RAUtilWindow.style.padding = '4px';

        var alertsHTML = '<div id="header" style="padding: 4px; background-color:#4cc600; font-weight: bold; text-align:center;">Roundabout Utility <a data-toggle="collapse" href="#divWrappers" id="collapserLink" style="float:right"><span id="collapser" style="cursor:pointer;border:thin outset black;padding:2px;" class="fa fa-caret-square-o-up"></a></span></div>';
        alertsHTML += '<div id="divWrappers" class="collapse in">';
        alertsHTML += '<div id="contentShift" style="padding: 4px; background-color:White; display:inline-block; border-style:solid; border-width:1px; margin-right:5px;">';
        alertsHTML += 'Shift amount</br><input type="text" name="shiftAmount" id="shiftAmount" size="1" style="border: 1px solid #000000" value="1"/> meter(s)&nbsp;';

        alertsHTML += '<div id="controls" style="padding: 4px;">';

        alertsHTML += '<table style="table-layout:fixed; width:60px; height:84px; margin-left:auto;margin-right:auto;">';
        alertsHTML += '<tr style="width:20px;height:28px;">';
        alertsHTML += '<td align="center"></td>';
        alertsHTML += '<td align="center">';
        //Single Shift Buttons
        alertsHTML += '<span id="RAShiftUpBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;">';//margin-left:23px;">';
        alertsHTML += '<i class="fa fa-angle-up"> </i>';
        alertsHTML += '<span id="UpBtnCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';
        alertsHTML += '<td align="center"></td>';
        alertsHTML += '</tr>';

        alertsHTML += '<tr style="width:20px;height:28px;">';
        alertsHTML += '<td align="center">';
        alertsHTML += '<span id="RAShiftLeftBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;padding-right:4px;">';//position:relative;padding:2px;padding-left:3px;padding-right:3px;margin-left:0px;top:10px;">';
        alertsHTML += '<i class="fa fa-angle-left"> </i>';
        alertsHTML += '<span id="LeftBtnCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';

        alertsHTML += '<td align="center"></td>';

        alertsHTML += '<td align="center">';
        alertsHTML += '<span id="RAShiftRightBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;padding-left:4px;">';//position:relative;padding:2px;padding-left:3px;padding-right:3px;top:10px;margin-left:15px;">';
        alertsHTML += '<i class="fa fa-angle-right"> </i>';
        alertsHTML += '<span id="RightBtnCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';
        alertsHTML += '</tr>';

        alertsHTML += '<tr style="width:20px;height:28px;">';
        alertsHTML += '<td align="center"></td>';

        alertsHTML += '<td align="center">';
        alertsHTML += '<span id="RAShiftDownBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;">';//;position:relative;top:20px;margin-left:17px;">';
        alertsHTML += '<i class="fa fa-angle-down"> </i>';
        alertsHTML += '<span id="DownBtnCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';

        alertsHTML += '<td align="center"></td>';
        alertsHTML += '</tr>';
        alertsHTML += '</table>';
        alertsHTML += '</div></div>';


        //***************** Rotation **************************
        alertsHTML += '<div id="contentRotate" style="padding: 4px; background-color:White;  display:inline-block; border-style:solid; border-width:1px; margin-right:5px;">';
        alertsHTML += 'Rotation amount</br><input type="text" name="rotationAmount" id="rotationAmount" size="1" style="border: 1px solid #000000" value="1"/> degree(s)&nbsp;';
        alertsHTML += '<div id="rotationControls" style="padding: 4px;">';
        alertsHTML += '<table style="table-layout:fixed; width:60px; height:84px; margin-left:auto; margin-right:auto;">';
        alertsHTML += '<tr style="width:20px;height:28px;">';
        alertsHTML += '<td align="center">';
        alertsHTML += '<span id="RARotateLeftBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;">';//margin-left:23px;">';
        alertsHTML += '<i class="fa fa-undo"> </i>';
        alertsHTML += '<span id="RotateLeftBtnCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';

        alertsHTML += '<td align="center">';
        alertsHTML += '<span id="RARotateRightBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;">';//margin-left:23px;">';
        alertsHTML += '<i class="fa fa-repeat"> </i>';
        alertsHTML += '<span id="RotateRightBtnCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';
        alertsHTML += '</tr></table>';
        alertsHTML += '</div></div>';

        //********************* Diameter change ******************
        /*
        alertsHTML += '<div id="diameterChange" style="padding: 4px; padding-top:11px; background-color:White; display:inline-block; border-style:solid; border-width:1px; height:152px; text-align:center;" >';
        alertsHTML += 'Change diameter</br></br>';
        alertsHTML += '<div id="DiameterChangeControls" style="padding: 4px;">';

        alertsHTML += '<table style="table-layout:fixed; height:84px; margin-left:auto;margin-right:auto;">';
        alertsHTML += '<tr style="width:20px;height:28px;">';
        alertsHTML += '<td align="center">';
        alertsHTML += '<span id="diameterChangeDecreaseBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;">';//margin-left:23px;">';
        alertsHTML += '<i class="fa fa-minus"> </i>';
        alertsHTML += '<span id="diameterChangeDecreaseCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';

        alertsHTML += '<td align="center" width="105">';
        alertsHTML += '<input type="text" name="diameterChangeAmount" id="diameterChangeAmount" size="1" style="border: 1px solid #000000" value="1"/> meter(s)&nbsp;';
        alertsHTML += '</td>';

        alertsHTML += '<td align="center">';
        alertsHTML += '<span id="diameterChangeIncreaseBtn" style="cursor:pointer;font-size:14px;border:thin outset black;padding:2px;">';//margin-left:23px;">';
        alertsHTML += '<i class="fa fa-plus"> </i>';
        alertsHTML += '<span id="diameterChangeIncreaseCaption" style="font-weight: bold;"></span>';
        alertsHTML += '</span>';
        alertsHTML += '</td>';
        alertsHTML += '</tr></table>';

        alertsHTML += '</div></div>';*/
        alertsHTML += '</div><input type="checkbox" id="chkRARoundaboutAngles">Enable Roundabout Angles</div>'; //Close divWrapers & outer div



        RAUtilWindow.innerHTML = alertsHTML;
        document.body.appendChild(RAUtilWindow);

        document.getElementById('RAShiftLeftBtn').addEventListener('click', RAShiftLeftBtnClick, false);
        document.getElementById('RAShiftRightBtn').addEventListener('click', RAShiftRightBtnClick, false);
        document.getElementById('RAShiftUpBtn').addEventListener('click', RAShiftUpBtnClick, false);
        document.getElementById('RAShiftDownBtn').addEventListener('click', RAShiftDownBtnClick, false);

        document.getElementById('RARotateLeftBtn').addEventListener('click', RARotateLeftBtnClick, false);
        document.getElementById('RARotateRightBtn').addEventListener('click', RARotateRightBtnClick, false);

        //document.getElementById('diameterChangeDecreaseBtn').addEventListener('click', diameterChangeDecreaseBtnClick, false);
        //document.getElementById('diameterChangeIncreaseBtn').addEventListener('click', diameterChangeIncreaseBtnClick, false);

        $('#shiftAmount').keypress(function(event) {
            if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
                event.preventDefault();
            }
        });

        $('#rotationAmount').keypress(function(event) {
            if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
                event.preventDefault();
            }
        });

        $('#collapserLink').click(function(){
            if($('#collapser').attr('class') == "fa fa-caret-square-o-down"){
                $("#collapser").removeClass("fa-caret-square-o-down");
                $("#collapser").addClass("fa-caret-square-o-up");
            }
            else{
                $("#collapser").removeClass("fa-caret-square-o-up");
                $("#collapser").addClass("fa-caret-square-o-down");
            }
            saveSettingsToStorage();
        });

        W.selectionManager.events.register("selectionchanged", null, checkDisplayTool);
        //W.model.actionManager.events.register("afterundoaction",null, undotriggered);
        //W.model.actionManager.events.register("afterclearactions",null,actionsCleared);

        var loadedSettings = $.parseJSON(localStorage.getItem("WME_RAUtil"));
        var defaultSettings = {
            divTop: "15%",
            divLeft: "25%",
            Expanded: true,
            RoundaboutAngles: true
        };
        _settings = loadedSettings ? loadedSettings : defaultSettings;

        $('#RAUtilWindow').css('left', _settings.divLeft);
        $('#RAUtilWindow').css('top', _settings.divTop);
        $("#chkRARoundaboutAngles").prop('checked', _settings.RoundaboutAngles);
        $("#chkRARoundaboutAngles").prop('checked', _settings.RoundaboutAngles);

        if(!_settings.Expanded){
            $("#divWrappers").removeClass("in");
            $("#divWrappers").addClass("collapse");
            $("#collapser").removeClass("fa-caret-square-o-up");
            $("#collapser").addClass("fa-caret-square-o-down");
        }

        $("#chkRARoundaboutAngles").click(function(){
            saveSettingsToStorage();

            if($("#chkRARoundaboutAngles").is(":checked")){
                W.map.events.register("zoomend", null, DrawRoundaboutAngles);
                W.map.events.register("moveend", null, DrawRoundaboutAngles);
                DrawRoundaboutAngles();
                drc_layer.setVisibility(true);
            }
            else{
                W.map.events.unregister("zoomend", null, DrawRoundaboutAngles);
                W.map.events.unregister("moveend", null, DrawRoundaboutAngles);
                drc_layer.setVisibility(false);
            }
        });

        if(_settings.RoundaboutAngles){
            W.map.events.register("zoomend", null, DrawRoundaboutAngles);
            W.map.events.register("moveend", null, DrawRoundaboutAngles);
            DrawRoundaboutAngles();
        }
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            var settings = {
                divTop: "15%",
                divLeft: "25%",
                Expanded: true,
                RoundaboutAngles: true
            };

            settings.divLeft = $('#RAUtilWindow').css('left');
            settings.divTop = $('#RAUtilWindow').css('top');
            settings.Expanded = $("#collapser").attr('class').indexOf("fa-caret-square-o-up") > -1;
            settings.RoundaboutAngles = $("#chkRARoundaboutAngles").is(":checked");
            localStorage.setItem("WME_RAUtil", JSON.stringify(settings));
        }
    }

    /*
    function undotriggered(){
        checkSaveChanges();
    }

    function actionsCleared(){
        //checkSaveChanges();
        totalActions = 0;
    }
    */

    function checkDisplayTool(){
        if(WazeWrap.hasSelectedFeatures() && WazeWrap.getSelectedFeatures()[0].model.type === 'segment'){
            if(!AllSelectedSegmentsRA() || WazeWrap.getSelectedFeatures().length === 0)
                $('#RAUtilWindow').css({'visibility': 'hidden'});
            else{
                $('#RAUtilWindow').css({'visibility': 'visible'});
                if(typeof jQuery.ui !== 'undefined')
                    $('#RAUtilWindow' ).draggable({ //Gotta nuke the height setting the dragging inserts otherwise the panel cannot collapse
                        stop: function(event, ui) {
                            $('#RAUtilWindow').css("height", "");
                            saveSettingsToStorage();
                        }
                    });
                //checkSaveChanges();
                checkAllEditable(WazeWrap.Model.getAllRoundaboutSegmentsFromObj(WazeWrap.getSelectedFeatures()[0]));
            }
        }
        else{
            $('#RAUtilWindow').css({'visibility': 'hidden'});
            if(typeof jQuery.ui !== 'undefined')
                $('#RAUtilWindow' ).draggable({
                        stop: function(event, ui) {
                            $('#RAUtilWindow').css("height", "");
                            saveSettingsToStorage();
                        }
                    });
        }
    }

    
    //var pendingChanges = false;
    /**
    Returns false if there are pending changes, true if no changes need saved.
    */
    /*function checkSaveChanges(){
        var $RASaveChanges = $('#RAUtilSaveChanges');
        if(W.model.actionManager.index >= 0 && (totalActions === 0 && (W.model.actionManager.actions.length > 0))){
            if($RASaveChanges.length === 0){
                $RASaveChanges = $('<div>', {id:'RAUtilSaveChanges', style:'color:red'});
                $RASaveChanges.text('You must save your changes before using this utility.');
                $('#RAUtilWindow').append($RASaveChanges);
                pendingChanges = true;
            }
        }
        else
        {
            $RASaveChanges.remove();
            pendingChanges = false;
        }
    }
    */

    function checkAllEditable(RASegs){
        var $RAEditable = $('#RAEditable');
        var allEditable = true;
        var segObj, fromNode, toNode;

        for(i=0; i<RASegs.length;i++){
            segObj = W.model.segments.get(RASegs[i]);
            fromNode = segObj.getFromNode();
            toNode = segObj.getToNode();

            if(segObj !== "undefined"){
                if(fromNode && fromNode !== "undefined" && !fromNode.areConnectionsEditable())
                    allEditable = false;
                else if(toNode && toNode !== "undefined" && !toNode.areConnectionsEditable())
                    allEditable = false;
                var toConnected, fromConnected;

                if(toNode){
                    toConnected = toNode.attributes.segIDs;
                    for(j=0;j<toConnected.length;j++){
                        if(W.model.segments.get(toConnected[j]) !== "undefined")
                            if(W.model.segments.get(toConnected[j]).hasClosures())
                                allEditable = false;
                    }
                }

                if(fromNode){
                    fromConnected = fromNode.attributes.segIDs;
                    for(j=0;j<fromConnected.length;j++){
                        if(W.model.segments.get(fromConnected[j]) !== "undefined")
                            if(W.model.segments.get(fromConnected[j]).hasClosures())
                                allEditable = false;
                    }
                }
            }
        }
        if(allEditable){
            $RAEditable.remove();
        }
        else{
            if($RAEditable.length === 0){
                $RAEditable = $('<div>', {id:'RAEditable', style:'color:red'});
                $RAEditable.text('One or more segments are locked above your rank or have a closure.');
                $('#RAUtilWindow').append($RAEditable);
            }
        }
        return allEditable;
    }

    function AllSelectedSegmentsRA(){
        for (i = 0; i < WazeWrap.getSelectedFeatures().length; i++){
            if(WazeWrap.getSelectedFeatures()[i].model.attributes.id < 0 || !WazeWrap.Model.isRoundaboutSegmentID(WazeWrap.getSelectedFeatures()[i].model.attributes.id))
                return false;
        }
        return true;
    }

    function ShiftSegmentNodesLat(segObj, latOffset){
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        if(checkAllEditable(RASegs)){
            var gps;
            var newGeometry = segObj.geometry.clone();
            var originalLength = segObj.geometry.components.length;
            var multiaction = new MultiAction();
            multiaction.setModel(W.model);

            for(i=0; i<RASegs.length; i++){
                segObj = W.model.segments.get(RASegs[i]);
                newGeometry = segObj.geometry.clone();
                originalLength = segObj.geometry.components.length;
                for(j=1; j < originalLength-1; j++){
                    gps = WazeWrap.Geometry.ConvertTo4326(segObj.geometry.components[j].x, segObj.geometry.components[j].y);
                    gps.lat += latOffset;
                    newGeometry.components.splice(j,0, new OL.Geometry.Point(segObj.geometry.components[j].x, WazeWrap.Geometry.ConvertTo900913(segObj.geometry.components[j].x,gps.lat).lat));
                    newGeometry.components.splice(j+1,1);
                }
                newGeometry.components[0].calculateBounds();
                newGeometry.components[originalLength-1].calculateBounds();
                multiaction.doSubAction(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));
                //W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));

                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];
                var newNodeGeometry = node.geometry.clone();
                gps = WazeWrap.Geometry.ConvertTo4326(node.attributes.geometry.x, node.attributes.geometry.y);
                gps.lat += latOffset;
                newNodeGeometry.y = WazeWrap.Geometry.ConvertTo900913(node.geometry.x, gps.lat).lat;
                newNodeGeometry.calculateBounds();

                var connectedSegObjs = {};
                var emptyObj = {};
                for(var j=0;j<node.attributes.segIDs.length;j++){
                    var segid = node.attributes.segIDs[j];
                    connectedSegObjs[segid] = W.model.segments.get(segid).geometry.clone();
                }
                //W.model.actionManager.add(new MoveNode(segObj, segObj.geometry, newNodeGeometry, connectedSegObjs, i));
                multiaction.doSubAction(new MoveNode(node, node.geometry, newNodeGeometry,connectedSegObjs,emptyObj));
                //W.model.actionManager.add(new MoveNode(node, node.geometry, newNodeGeometry));
                //totalActions +=2;
            }
            W.model.actionManager.add(multiaction);
        }
    }

    function ShiftSegmentsNodesLong(segObj, longOffset)    {
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        if(checkAllEditable(RASegs)){
            var gps, newGeometry, originalLength;
            var multiaction = new MultiAction();
            multiaction.setModel(W.model);

            //Loop through all RA segments & adjust
            for(i=0; i<RASegs.length; i++){
                segObj = W.model.segments.get(RASegs[i]);
                newGeometry = segObj.geometry.clone();
                originalLength = segObj.geometry.components.length;
                for(j=1; j < originalLength-1; j++){
                    gps = WazeWrap.Geometry.ConvertTo4326(segObj.geometry.components[j].x, segObj.geometry.components[j].y);
                    gps.lon += longOffset;
                    newGeometry.components.splice(j,0, new OL.Geometry.Point(WazeWrap.Geometry.ConvertTo900913(gps.lon, segObj.geometry.components[j].y).lon, segObj.geometry.components[j].y));
                    newGeometry.components.splice(j+1,1);
                }
                newGeometry.components[0].calculateBounds();
                newGeometry.components[originalLength-1].calculateBounds();
                //W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));
                multiaction.doSubAction(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));

                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];

                var newNodeGeometry = node.geometry.clone();
                gps = WazeWrap.Geometry.ConvertTo4326(node.attributes.geometry.x, node.attributes.geometry.y);
                gps.lon += longOffset;
                newNodeGeometry.x = WazeWrap.Geometry.ConvertTo900913(gps.lon, node.geometry.y).lon;
                newNodeGeometry.calculateBounds();

                var connectedSegObjs = {};
                var emptyObj = {};
                for(var j=0;j<node.attributes.segIDs.length;j++){
                    var segid = node.attributes.segIDs[j];
                    connectedSegObjs[segid] = W.model.segments.get(segid).geometry.clone();
                }
                //W.model.actionManager.add(new MoveNode(node, node.geometry, newNodeGeometry));
                multiaction.doSubAction(new MoveNode(node, node.geometry, newNodeGeometry, connectedSegObjs, emptyObj));
                //totalActions +=2;
            }
            W.model.actionManager.add(multiaction);
        }
    }

    function rotatePoints(origin, points, angle){
        console.log("Origin: " + origin);
        console.log("Point: " + points[0]);
        var lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(points),null,null);
        lineFeature.geometry.rotate(angle, new OpenLayers.Geometry.Point(origin.lon, origin.lat));
        console.log(new OpenLayers.Geometry.Point(origin.lon, origin.lat).distanceTo(points[0]));
        console.log(lineFeature.geometry.components[0]);
        return lineFeature.geometry.components.clone();
    }

    function RotateRA(segObj, angle){
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        var raCenter = W.model.junctions.objects[segObj.model.attributes.junctionID].geometry.coordinates;

        if(checkAllEditable(RASegs)){
            var gps, newGeometry, originalLength;
            var multiaction = new MultiAction();
            multiaction.setModel(W.model);

            //Loop through all RA segments & adjust
            for(i=0; i<RASegs.length; i++){
                segObj = W.model.segments.get(RASegs[i]);
                newGeometry = segObj.geometry.clone();
                originalLength = segObj.geometry.components.length;

                var center = WazeWrap.Geometry.ConvertTo900913(raCenter[0], raCenter[1]);
                var segPoints = [];
                //Have to copy the points manually (can't use .clone()) otherwise the geometry rotation modifies the geometry of the segment itself and that hoses WME.
                for(j=0; j<originalLength;j++){
                    segPoints.push(new OL.Geometry.Point(segObj.geometry.components[j].x, segObj.geometry.components[j].y));
                }

                var newPoints = rotatePoints(center, segPoints, angle);

                for(j=1; j<originalLength-1;j++){
                    newGeometry.components.splice(j, 0, new OL.Geometry.Point(newPoints[j].x, newPoints[j].y));
                    newGeometry.components.splice(j+1,1);
                }

                newGeometry.components[0].calculateBounds();
                newGeometry.components[originalLength-1].calculateBounds();
                //W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));
                multiaction.doSubAction(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));

                //**************Rotate Nodes******************
                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];

                var nodePoints = [];
                var newNodeGeometry = node.geometry.clone();

                nodePoints.push(new OL.Geometry.Point(node.attributes.geometry.x, node.attributes.geometry.y));
                nodePoints.push(new OL.Geometry.Point(node.attributes.geometry.x, node.attributes.geometry.y)); //add it twice because lines need 2 points

                gps = rotatePoints(center, nodePoints, angle);

                newNodeGeometry.x = gps[0].x;
                newNodeGeometry.y = gps[0].y;

                newNodeGeometry.calculateBounds();

                var connectedSegObjs = {};
                var emptyObj = {};
                for(var j=0;j<node.attributes.segIDs.length;j++){
                    var segid = node.attributes.segIDs[j];
                    connectedSegObjs[segid] = W.model.segments.get(segid).geometry.clone();
                }
                multiaction.doSubAction(new MoveNode(node, node.geometry, newNodeGeometry, connectedSegObjs, emptyObj));
                //totalActions +=2;
            }
            W.model.actionManager.add(multiaction);
        }
    }

    function ChangeDiameter(segObj, amount){
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        var raCenter = W.model.junctions.objects[segObj.model.attributes.junctionID].geometry.coordinates;

        if(checkAllEditable(RASegs)){
            var gps, newGeometry, originalLength;

            var center = WazeWrap.Geometry.ConvertTo900913(raCenter[0], raCenter[1]);
            //Loop through all RA segments & adjust
            for(i=0; i<RASegs.length; i++){
                segObj = W.model.segments.get(RASegs[i]);
                newGeometry = segObj.geometry.clone();
                originalLength = segObj.geometry.components.length;
                for(j=1; j < originalLength-1; j++){
                    gps = WazeWrap.Geometry.ConvertTo4326(segObj.geometry.components[j].x, segObj.geometry.components[j].y);
                    var k = Math.atan2(origin.y - gps.lat, origin.x - gps.lon);

                    //gps.lon += longOffset;
                    //newGeometry.components.splice(j,0, new OL.Geometry.Point(WazeWrap.Geometry.ConvertTo900913(gps.lon, segObj.geometry.components[j].y).lon, segObj.geometry.components[j].y));
                    //newGeometry.components.splice(j+1,1);
                }
                newGeometry.components[0].calculateBounds();
                newGeometry.components[originalLength-1].calculateBounds();
                W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));

                /*
                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];

                var newNodeGeometry = node.geometry.clone();
                gps = WazeWrap.Geometry.ConvertTo4326(node.attributes.geometry.x, node.attributes.geometry.y);
                gps.lon += longOffset;
                newNodeGeometry.x = WazeWrap.Geometry.ConvertTo900913(gps.lon, node.geometry.y).lon;
                newNodeGeometry.calculateBounds();
                W.model.actionManager.add(new MoveNode(node, node.geometry, newNodeGeometry));
                totalActions +=2;
                */
            }
        }
    }

    function diameterChangeDecreaseBtnClick(e){
        e.stopPropagation();
        var segObj = WazeWrap.getSelectedFeatures()[0];
        ChangeDiameter(segObj, -$('#diameterChangeAmount').val());
    }

    function diameterChangeIncreaseBtnClick(e){
        e.stopPropagation();
        var segObj = WazeWrap.getSelectedFeatures()[0];
        ChangeDiameter(segObj, $('#diameterChangeAmount').val());
    }

    function RARotateLeftBtnClick(e){
        e.stopPropagation();
        var segObj = WazeWrap.getSelectedFeatures()[0];
        RotateRA(segObj, $('#rotationAmount').val());
    }

    function RARotateRightBtnClick(e){
        e.stopPropagation();

        var segObj = WazeWrap.getSelectedFeatures()[0];
        RotateRA(segObj, -$('#rotationAmount').val());
    }

    //Left
    function RAShiftLeftBtnClick(e)
    {
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
            var segObj = WazeWrap.getSelectedFeatures()[0];
            var convertedCoords = WazeWrap.Geometry.ConvertTo4326(segObj.geometry.components[0].x, segObj.geometry.components[0].y);
            var gpsOffsetAmount = WazeWrap.Geometry.CalculateLongOffsetGPS(-$('#shiftAmount').val(), convertedCoords.lon, convertedCoords.lat);
            ShiftSegmentsNodesLong(segObj, gpsOffsetAmount);
        //}
    }
    //Right
    function RAShiftRightBtnClick(e)
    {
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
            var segObj = WazeWrap.getSelectedFeatures()[0];
            var convertedCoords = WazeWrap.Geometry.ConvertTo4326(segObj.model.geometry.components[0].x, segObj.model.geometry.components[0].y);
            var gpsOffsetAmount = WazeWrap.Geometry.CalculateLongOffsetGPS($('#shiftAmount').val(), convertedCoords.lon, convertedCoords.lat);
            ShiftSegmentsNodesLong(segObj, gpsOffsetAmount);
        //}
    }
    //Up
    function RAShiftUpBtnClick(e)
    {
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
            var segObj = WazeWrap.getSelectedFeatures()[0];
            var gpsOffsetAmount = WazeWrap.Geometry.CalculateLatOffsetGPS($('#shiftAmount').val(), WazeWrap.Geometry.ConvertTo4326(segObj.geometry.components[0].x, segObj.geometry.components[0].y));
            ShiftSegmentNodesLat(segObj, gpsOffsetAmount);
        //}
    }
    //Down
    function RAShiftDownBtnClick(e)
    {
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
            var segObj = WazeWrap.getSelectedFeatures()[0];
            var gpsOffsetAmount = WazeWrap.Geometry.CalculateLatOffsetGPS(-$('#shiftAmount').val(), WazeWrap.Geometry.ConvertTo4326(segObj.geometry.components[0].x, segObj.geometry.components[0].y));
            ShiftSegmentNodesLat(segObj, gpsOffsetAmount);
        //}
    }

    //*************** Roundabout Angles **********************
    function DrawRoundaboutAngles()
    {
        //---------get or create layer
        var layers = W.map.getLayersBy("uniqueName","__DrawRoundaboutAngles");


        if(layers.length > 0) {
            drc_layer = layers[0];
        } else {

            var drc_style = new OL.Style({
                fillOpacity: 0.0,
                strokeOpacity: 1.0,
                fillColor: "#FF40C0",
                strokeColor: "${strokeColor}",
                strokeWidth: 10,
                fontWeight: "bold",
                pointRadius: 0,
                label : "${labelText}",
                fontFamily: "Tahoma, Courier New",
                labelOutlineColor: "#FFFFFF",
                labelOutlineWidth: 3,
                fontColor: "${labelColor}",
                fontSize: "10px"
            });

            drc_layer = new OL.Layer.Vector("Roundabout Angles", {
                displayInLayerSwitcher: true,
                uniqueName: "__DrawRoundaboutAngles",
                styleMap: new OL.StyleMap(drc_style)
            });

            I18n.translations[I18n.currentLocale()].layers.name["__DrawRoundaboutAngles"] = "Roundabout Angles";
            W.map.addLayer(drc_layer);

            drc_layer.setVisibility(true);
        }

        localStorage.WMERAEnabled = drc_layer.visibility;

        if (drc_layer.visibility == false) {
            drc_layer.removeAllFeatures();
            return;
        }

        if (W.map.zoom < 1) {
            drc_layer.removeAllFeatures();
            return;
        }

        //---------collect all roundabouts first
        var rsegments = {};

        for (var iseg in W.model.segments.objects) {
            let isegment = W.model.segments.get(iseg);
            var iattributes = isegment.attributes;
            var iline = isegment.geometry.id;

            let irid = iattributes.junctionID;

            if (iline !== null && irid != undefined) {
                var rsegs = rsegments[irid];
                if (rsegs == undefined) {
                    rsegments[irid] = rsegs = new Array();
                }
                rsegs.push(isegment);
            }
        }

        var drc_features = [];

        //-------for each roundabout do...
        for (let irid in rsegments) {
            let rsegs = rsegments[irid];

            let isegment = rsegs[0];
            var jsegment;

            var nodes = [];
            var nodes_x = [];
            var nodes_y = [];

            nodes = rsegs.map(seg => seg.attributes.fromNodeID); //get from nodes
            nodes = [...nodes, ...rsegs.map(seg => seg.attributes.toNodeID)]; //get to nodes add to from nodes
            nodes = _.uniq(nodes); //remove duplicates

            var node_objects = W.model.nodes.getByIds(nodes);
            nodes_x = node_objects.map(n => n.geometry.x); //get all x locations
            nodes_y = node_objects.map(n => n.geometry.y); //get all y locations

            var sr_x   = 0;
            var sr_y   = 0;
            var radius = 0;
            var numNodes = nodes_x.length;

            if (numNodes >= 1) {
                var ax = nodes_x[0];
                var ay = nodes_y[0];

                var junction = W.model.junctions.get(irid);
                var junction_coords = junction && junction.geometry && junction.geometry.coordinates;

                if (junction_coords && junction_coords.length == 2) {
                    //---------- get center point from junction model
                    var lonlat = new OL.LonLat(junction_coords[0], junction_coords[1]);
                    lonlat.transform(W.map.displayProjection, W.map.projection);
                    var pt = lonlat.toPoint();
                    sr_x = pt.x;
                    sr_y = pt.y;
                }
                else if (numNodes >= 3) {
                    //-----------simple approximation of centre point calculated from three first points
                    var bx = nodes_x[1];
                    var by = nodes_y[1];
                    var cx = nodes_x[2];
                    var cy = nodes_y[2];

                    var x1 = (bx + ax) * 0.5;


                    var y11 = (by + ay) * 0.5;
                    var dy1 = bx - ax;
                    var dx1 = -(by - ay);
                    var x2 = (cx + bx) * 0.5;
                    var y2 = (cy + by) * 0.5;
                    var dy2 = cx - bx;
                    var dx2 = -(cy - by);
                    sr_x = (y11 * dx1 * dx2 + x2 * dx1 * dy2 - x1 * dy1 * dx2 - y2 * dx1 * dx2)/ (dx1 * dy2 - dy1 * dx2);
                    sr_y = (sr_x - x1) * dy1 / dx1 + y11;
                }
                else {
                    //---------- simple bounds-based calculation of center point
                    var rbounds = new OL.Bounds();
                    rbounds.extend(isegment.geometry.bounds);
                    rbounds.extend(jsegment.geometry.bounds);

                    var center = rbounds.getCenterPixel();
                    sr_x = center.x;
                    sr_y = center.y;
                }

                var angles = [];
                var rr = -1;
                var r_ix;

                for(let i=0; i<nodes_x.length; i++) {

                    var dx = nodes_x[i] - sr_x;
                    var dy = nodes_y[i] - sr_y;

                    var rr2 = dx*dx + dy*dy;
                    if (rr < rr2) {
                        rr = rr2;
                        r_ix = i;
                    }

                    var angle = Math.atan2(dy, dx);
                    angle = (360.0 + (angle * 180.0 / Math.PI));
                    if (angle < 0.0) angle += 360.0;
                    if (angle > 360.0) angle -= 360.0;
                    angles.push(angle);
                }

                radius = Math.sqrt(rr);

                //---------sorting angles for calulating angle difference between two segments
                angles = angles.sort(function(a,b) { return a - b; });
                angles.push( angles[0] + 360.0);
                angles = angles.sort(function(a,b) { return a - b; });

                var drc_color = (numNodes <= 4) ? "#0040FF" : "#002080";

                var drc_point = new OL.Geometry.Point(sr_x, sr_y );
                var drc_circle = new OL.Geometry.Polygon.createRegularPolygon( drc_point, radius, 10 * W.map.zoom );
                var drc_feature = new OL.Feature.Vector(drc_circle, {labelText: "", labelColor: "#000000", strokeColor: drc_color, }  );
                drc_features.push(drc_feature);


                if (numNodes >= 2 && numNodes <= 4 && W.map.zoom >= 5) {
                    for(let i=0; i<nodes_x.length; i++) {
                        var ix = nodes_x[i];
                        var iy = nodes_y[i];
                        var startPt   = new OL.Geometry.Point( sr_x, sr_y );
                        var endPt     = new OL.Geometry.Point( ix, iy );
                        var line      = new OL.Geometry.LineString([startPt, endPt]);
                        var style     = {strokeColor:drc_color, strokeWidth:2};
                        var fea       = new OL.Feature.Vector(line, {}, style);
                        drc_features.push(fea);
                    }

                    var angles_int = [];
                    var angles_float = [];
                    var angles_sum = 0;

                    for(let i=0; i<angles.length - 1; i++) {

                        var ang = angles[i+1] - angles[i+0];
                        if (ang < 0) ang += 360.0;
                        if (ang < 0) ang += 360.0;

                        if (ang < 135.0) {
                            ang = ang - 90.0;
                        }
                        else {
                            ang = ang - 180.0;
                        }

                        angles_sum += parseInt(ang);

                        angles_float.push( ang );
                        angles_int.push( parseInt(ang) );
                    }

                    if (angles_sum > 45) angles_sum -= 90;
                    if (angles_sum > 45) angles_sum -= 90;
                    if (angles_sum > 45) angles_sum -= 90;
                    if (angles_sum > 45) angles_sum -= 90;
                    if (angles_sum < -45) angles_sum += 90;
                    if (angles_sum < -45) angles_sum += 90;
                    if (angles_sum < -45) angles_sum += 90;
                    if (angles_sum < -45) angles_sum += 90;

                    if (angles_sum != 0) {
                        for(var i=0; i<angles_int.length; i++) {
                            var a = angles_int[i];
                            var af = angles_float[i] - angles_int[i];
                            if ( (a < 10 || a > 20) && (af < -0.5 || af > 0.5) )  {
                                angles_int[i] += -angles_sum;

                                break;
                            }
                        }
                    }

                    if (numNodes == 2) {
                        angles_int[1] = -angles_int[0];
                        angles_float[1] = -angles_float[0];
                    }

                    for(let i=0; i<angles.length - 1; i++) {
                        var arad = (angles[i+0] + angles[i+1]) * 0.5 * Math.PI / 180.0;
                        var ex = sr_x + Math.cos (arad) * radius * 0.5;
                        var ey = sr_y + Math.sin (arad) * radius * 0.5;

                        //*** Angle Display Rounding ***
                        var angint = Math.round(angles_float[i] * 100)/100;

                        var kolor = "#004000";
                        if (angint <= -15 || angint >= 15) kolor = "#FF0000";
                        else if (angint <= -13 || angint >= 13) kolor = "#FFC000";

                        var pt = new OL.Geometry.Point(ex, ey);
                        drc_features.push(new OL.Feature.Vector( pt, {labelText: (angint + "°"), labelColor: kolor } ));
                        //drc_features.push(new OL.Feature.Vector( pt, {labelText: (+angles_float[i].toFixed(2) + "°"), labelColor: kolor } ));
                    }
                }
                else {
                    for(let i=0; i < nodes_x.length; i++) {
                        var ix = nodes_x[i];
                        var iy = nodes_y[i];
                        var startPt   = new OL.Geometry.Point( sr_x, sr_y );
                        var endPt     = new OL.Geometry.Point( ix, iy );
                        var line      = new OL.Geometry.LineString([startPt, endPt]);
                        var style     = {strokeColor:drc_color, strokeWidth:2};
                        var fea       = new OL.Feature.Vector(line, {}, style);
                        drc_features.push(fea);
                    }
                }

                var p1   = new OL.Geometry.Point( nodes_x[r_ix], nodes_y[r_ix] );
                var p2   = new OL.Geometry.Point( sr_x, sr_y );
                var line = new OL.Geometry.LineString([p1, p2]);
                var geo_radius = line.getGeodesicLength(W.map.projection);

                var diam = geo_radius * 2.0;
                var pt = new OL.Geometry.Point(sr_x, sr_y);
                drc_features.push(new OL.Feature.Vector( pt, {labelText: (diam.toFixed(0) + "m"), labelColor: "#000000" } ));

            }

        }

        drc_layer.removeAllFeatures();
        drc_layer.addFeatures(drc_features);
    }

})();


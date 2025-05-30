// ==UserScript==
// @name         WME RA Util
// @namespace    https://greasyfork.org/users/30701-justins83-waze
// @version      2025.05.30.01
// @description  Providing basic utility for RA adjustment without the need to delete & recreate
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/*
// @exclude      https://www.waze.com/user/editor*
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://cdn.jsdelivr.net/gh/WazeSpace/wme-sdk-plus@latest/wme-sdk-plus.js
// @require      https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js
// @connect      greasyfork.org
// @author       JustinS83
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @license      GPLv3
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @downloadURL https://update.greasyfork.org/scripts/23616/WME%20RA%20Util.user.js
// @updateURL https://update.greasyfork.org/scripts/23616/WME%20RA%20Util.user.js
// ==/UserScript==

/* global W */
/* global WazeWrap */
/* global OpenLayers */
/* global require */
/* global $ */
/* global _ */
/* global I18n */
/* eslint curly: ["warn", "multi-or-nest"] */

/*
non-normal RA color:#FF8000
normal RA color:#4cc600
*/
(function() {

    let sdk;
    var RAUtilWindow = null;
    var UpdateSegmentGeometry;
    var MoveNode, MultiAction;
    var drc_layer;
    const SCRIPT_VERSION = GM_info.script.version.toString();
    const SCRIPT_NAME = GM_info.script.name;
    const DOWNLOAD_URL = GM_info.scriptUpdateURL;

    //var totalActions = 0;
    var _settings;
    const updateMessage = "Conversion to WME SDK";

    async function bootstrap() {
        const wmeSdk = getWmeSdk({scriptId: "wme-ra-util", scriptName: "WME RA Util"});
        const sdkPlus = await initWmeSdkPlus(wmeSdk, {
            hooks: ['Editing.Transactions'],
        });
        sdk = sdkPlus || wmeSdk;
        sdk.Events.once({ eventName: "wme-ready" }).then(() => {
            loadScriptUpdateMonitor();
            init();
        });
    }

    function waitForWME() {
        if (typeof W === 'undefined' || 
            typeof getWmeSdk === 'undefined' || 
            !unsafeWindow.SDK_INITIALIZED) {
            setTimeout(waitForWME, 100);
            return;
        }
        
        unsafeWindow.SDK_INITIALIZED.then(bootstrap);
    }
    
    waitForWME();

    function loadScriptUpdateMonitor() {
        let updateMonitor;
        try {
            updateMonitor = new WazeWrap.Alerts.ScriptUpdateMonitor(SCRIPT_NAME, SCRIPT_VERSION, DOWNLOAD_URL, GM_xmlhttpRequest);
            updateMonitor.start();
        } catch (ex) {
            // Report, but don't stop if ScriptUpdateMonitor fails.
            console.error(`${SCRIPT_NAME}:`, ex);
        }
    }

    function init(){
        injectCss();
        sdk.Map.addLayer({
            layerName: "__DrawRoundaboutAngles",
            styleRules: styleConfig.styleRules,
            styleContext: styleConfig.styleContext,
        });
        sdk.Map.setLayerVisibility({layerName: "__DrawRoundaboutAngles", visibility: true})

        console.log("RA UTIL");
        console.log(GM_info.script);

        RAUtilWindow = document.createElement('div');
        RAUtilWindow.id = "RAUtilWindow";
        RAUtilWindow.style.position = 'fixed';
        RAUtilWindow.style.visibility = 'hidden';
        RAUtilWindow.style.top = '15%';
        RAUtilWindow.style.left = '25%';
        RAUtilWindow.style.width = '510px';
        RAUtilWindow.style.zIndex = 100;
        RAUtilWindow.style.backgroundColor = '#FFFFFE';
        RAUtilWindow.style.borderWidth = '0px';
        RAUtilWindow.style.borderStyle = 'solid';
        RAUtilWindow.style.borderRadius = '10px';
        RAUtilWindow.style.boxShadow = '5px 5px 10px Silver';
        RAUtilWindow.style.padding = '4px';

        var alertsHTML = '<div id="header" style="padding: 4px; background-color:#92C3D3; border-radius: 5px;-moz-border-radius: 5px;-webkit-border-radius: 5px; color: white; font-weight: bold; text-align:center; letter-spacing: 1px;text-shadow: black 0.1em 0.1em 0.2em;"><img src="https://storage.googleapis.com/wazeopedia-files/1/1e/RA_Util.png" style="float:left"></img> Roundabout Utility <a data-toggle="collapse" href="#divWrappers" id="collapserLink" style="float:right"><span id="collapser" style="cursor:pointer;padding:2px;color:white;" class="fa fa-caret-square-o-up"></a></span></div>';
        // start collapse // I put it al the beginning
      alertsHTML += '<div id="divWrappers" class="collapse in">';
         //***************** Round About Angles **************************
         alertsHTML += '<p style="margin: 10px 0px 0px 20px;"><input type="checkbox" id="chkRARoundaboutAngles">&nbsp;Enable Roundabout Angles</p>';
         //***************** Shift Amount **************************
         // Define BOX
         alertsHTML += '<div id="contentShift" style="text-align:center;float:left; width: 120px;max-width: 24%;height: 170px;margin: 1em 5px 0px 0px;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;}">';
         alertsHTML += '<b>Shift amount</b></br><input type="text" name="shiftAmount" id="shiftAmount" size="1" style="float: left; text-align: center;font: inherit; line-height: normal; width: 30px; height: 20px; margin: 5px 4px; box-sizing: border-box; display: block; padding-left: 0; border-bottom-color: rgba(black,.3); background: transparent; outline: none; color: black;" value="1"/> <div style="margin: 5px 4px;">Meter(s)';
            // Shift amount controls
            alertsHTML += '<div id="controls" style="text-align:center; padding:06px 4px;width=100px; height=100px;margin: 5px 0px;border-style:solid; border-width: 2px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 50px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 50px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 50px -14px rgba(0,0,0,1); background:#92C3D3;align:center;">';
            //Single Shift Up Button
            alertsHTML += '<span id="RAShiftUpBtn" style="cursor:pointer;font-size:14px;">';
            alertsHTML += '<i class="fa fa-angle-double-up fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; vertical-align: top;"> </i>';
            alertsHTML += '<span id="UpBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span><br>';
            //Single Shift Left Button
            alertsHTML += '<span id="RAShiftLeftBtn" style="cursor:pointer;font-size:14px;margin-left:-40px;">';
            alertsHTML += '<i class="fa fa-angle-double-left fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; vertical-align: middle"> </i>';
            alertsHTML += '<span id="LeftBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span>';
            //Single Shift Right Button
            alertsHTML += '<span id="RAShiftRightBtn" style="float: right;cursor:pointer;font-size:14px;margin-right:5px;">';
            alertsHTML += '<i class="fa fa-angle-double-right fa-2x" style="color: white;text-shadow: black 0.1em 0.1em 0.2em;  vertical-align: middle"> </i>';
            alertsHTML += '<span id="RightBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span><br>';
            //Single Shift Down Button
            alertsHTML += '<span id="RAShiftDownBtn" style="cursor:pointer;font-size:14px;margin-top:0px;">';
            alertsHTML += '<i class="fa fa-angle-double-down fa-2x" style="color: white;text-shadow: black 0.1em 0.1em 0.2em;  vertical-align: middle"> </i>';
            alertsHTML += '<span id="DownBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span>';
         alertsHTML += '</div></div></div>';
         //***************** Rotation **************************
         // Define BOX
         alertsHTML += '<div id="contentRotate" style="float:left; text-align: center;width: 120px;max-width: 24%;max-height:145px;margin: 1em auto;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;  display:inline-block; border-style:solid; border-width:1px; height:152px;  margin-right:5px;">';
         alertsHTML += '<b>Rotation amount</b></br><input type="text" name="rotationAmount" id="rotationAmount" size="1" style="float: left; text-align: center;font: inherit; line-height: normal; width: 30px; height: 20px; margin: 5px 4px; box-sizing: border-box; display: block; padding-left: 0; border-bottom-color: rgba(black,.3); background: transparent; outline: none; color: black;" value="1"/> <div style="margin: 5px 4px;">Degree(s)';
            // Rotation controls
            alertsHTML += '<div id="rotationControls" style="padding: 6px 4px;width=100px; margin: 20px 0px 50px 0px;align:center;">';
               // Rotate Button on the Left
               alertsHTML += '<span id="RARotateLeftBtn" class="btnRotate" style="float: left;">';
               alertsHTML += '<i class="fa fa-undo fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;"> </i>';
               alertsHTML += '<span id="RotateLeftBtnCaption" style="font-weight: bold;"></span>';
               alertsHTML += '</span>';
               // Rotate button on the Right
               alertsHTML += '<span id="RARotateRightBtn" class="btnRotate" style="float: right;">';
               alertsHTML += '<i class="fa fa-repeat fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;"> </i>';
               alertsHTML += '<span id="RotateRightBtnCaption" style="font-weight: bold;"></span>';
         alertsHTML += '</div></div></div>';
         //********************* Diameter change ******************
         // Define BOX
         alertsHTML += '<div id="diameterChange" style="float:left; text-align: center;width: 120px;max-width: 24%;max-height:145px;margin: 1em auto;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;  display:inline-block; border-style:solid; border-width:1px; height:152px;  margin-right:5px;">';
         alertsHTML += '<b>Change diameter</b></br></br>';
              // Diameter Change controls
            alertsHTML += '<div id="DiameterChangeControls" style="padding: 6px 4px;width=100px; margin: 5px 7px 50px 7px;align:center;">';
               // Decrease Button
               alertsHTML += '<span id="diameterChangeDecreaseBtn" style="float: left; width=45px; height=45px; background-color:#92C3D3; cursor:pointer; padding: 5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);">';
               alertsHTML += '<i class="fa fa-compress fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;;"> </i>';
               alertsHTML += '<span id="diameterChangeDecreaseCaption" style="font-weight: bold;"></span>';
               alertsHTML += '</span>';
               // Increase Button
               alertsHTML += '<span id="diameterChangeIncreaseBtn" style="float: right; width=45px; height=45px; background-color:#92C3D3; cursor:pointer; padding: 5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);">';
               alertsHTML += '<i class="fa fa-arrows-alt fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;"> </i>';
               alertsHTML += '<span id="diameterChangeIncreaseCaption" style="font-weight: bold;"></span>';
               alertsHTML += '</span>';
         alertsHTML += '</div></div>';
         //***************** Bump nodes **********************
         // Define BOX
         alertsHTML += '<div id="bumpNodes" style="float:left; text-align: center;width: 120px;max-width: 24%;max-height:145px;margin: 1em auto 0px auto;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;  display:inline-block; border-style:solid; border-width:1px; height:152px;  margin-right:5px;">';
         alertsHTML += '<b>Move nodes</b></br>';
         // Move Nodes controls
         alertsHTML += '<div id="MoveNodesControls" style="padding: 2px;">';
            // Button A
            alertsHTML += '<div style="text-align:center; font-size:18px;">A Node';
               // Move node IN
               alertsHTML += '<p><span id="btnMoveANodeIn" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 15px 3px 15px; margin:3px;">in</span>';
               // Move node OUT
               alertsHTML += '<span id="btnMoveANodeOut" class="btnMoveNode" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 10px 3px 10px; margin:3px;">out</span>';
               alertsHTML += '</div>';
            // Button B
            alertsHTML += '<div style="text-align:center; font-size:18px;">B Node';
               // Move node IN
               alertsHTML += '<p><span id="btnMoveBNodeIn" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 15px 3px 15px; margin:3px;">in</span>';
               // Move node OUT
               alertsHTML += '<span id="btnMoveBNodeOut" class="btnMoveNode" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 10px 3px 10px; margin:3px;">out</span>';
               alertsHTML += '</div>';
        alertsHTML += '</div></div></div>';


        RAUtilWindow.innerHTML = alertsHTML;
        document.body.appendChild(RAUtilWindow);

        $('#RAShiftLeftBtn').click(RAShiftLeftBtnClick);
        $('#RAShiftRightBtn').click(RAShiftRightBtnClick);
        $('#RAShiftUpBtn').click(RAShiftUpBtnClick);
        $('#RAShiftDownBtn').click(RAShiftDownBtnClick);

        $('#RARotateLeftBtn').click(RARotateLeftBtnClick);
        $('#RARotateRightBtn').click(RARotateRightBtnClick);

        $('#diameterChangeDecreaseBtn').click(diameterChangeDecreaseBtnClick);
        $('#diameterChangeIncreaseBtn').click(diameterChangeIncreaseBtnClick);

        $('#btnMoveANodeIn').click(function(){moveNodeIn(sdk.Editing.getSelection().ids[0], sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]}).fromNodeId);});
        $('#btnMoveANodeOut').click(function(){moveNodeOut(sdk.Editing.getSelection().ids[0], sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]}).fromNodeId);});
        $('#btnMoveBNodeIn').click(function(){moveNodeIn(sdk.Editing.getSelection().ids[0], sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]}).toNodeId);});
        $('#btnMoveBNodeOut').click(function(){moveNodeOut(sdk.Editing.getSelection().ids[0], sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]}).toNodeId);});

        $('#shiftAmount').keypress(function(event) {
            if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
                event.preventDefault();
        });

        $('#rotationAmount').keypress(function(event) {
            if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
                event.preventDefault();
        });

        $('#collapserLink').click(function(){
            $("#divWrappers").slideToggle("fast");
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

        sdk.Events.on({eventName: "wme-selection-changed", eventHandler: checkDisplayTool});
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
            //$("#divWrappers").removeClass("in");
            //$("#divWrappers").addClass("collapse");
            $("#divWrappers").hide();
            $("#collapser").removeClass("fa-caret-square-o-up");
            $("#collapser").addClass("fa-caret-square-o-down");
        }

        $("#chkRARoundaboutAngles").click(function(){
            saveSettingsToStorage();

            if($("#chkRARoundaboutAngles").is(":checked")){
                sdk.Events.on({eventName: "wme-map-zoom-changed", eventHandler: DrawRoundaboutAngles});
                sdk.Events.on({eventName: "wme-map-move-end", eventHandler: DrawRoundaboutAngles});
                DrawRoundaboutAngles();
                sdk.Map.setLayerVisibility({layerName: "__DrawRoundaboutAngles", visibility: true});
            }
            else{
                sdk.Events.off({eventName: "wme-map-zoom-changed", eventHandler: DrawRoundaboutAngles});
                sdk.Events.off({eventName: "wme-map-move-end", eventHandler: DrawRoundaboutAngles});
                sdk.Map.setLayerVisibility({layerName: "__DrawRoundaboutAngles", visibility: false});
            }
        });

        if(_settings.RoundaboutAngles){
            sdk.Events.on({eventName: "wme-map-zoom-changed", eventHandler: DrawRoundaboutAngles});
            sdk.Events.on({eventName: "wme-map-move-end", eventHandler: DrawRoundaboutAngles});
            DrawRoundaboutAngles();
        }

        WazeWrap.Interface.ShowScriptUpdate("WME RA Util", GM_info.script.version, updateMessage, "https://greasyfork.org/en/scripts/23616-wme-ra-util", "https://www.waze.com/forum/viewtopic.php?f=819&t=211079");
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            _settings.divLeft = $('#RAUtilWindow').css('left');
            _settings.divTop = $('#RAUtilWindow').css('top');
            _settings.Expanded = $("#collapser").attr('class').indexOf("fa-caret-square-o-up") > -1;
            _settings.RoundaboutAngles = $("#chkRARoundaboutAngles").is(":checked");
            localStorage.setItem("WME_RAUtil", JSON.stringify(_settings));
        }
    }

    function checkDisplayTool(){
        if(sdk.Editing.getSelection() && sdk.Editing.getSelection().objectType === 'segment'){
            if(!AllSelectedSegmentsRA() || sdk.Editing.getSelection().ids.length === 0)
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
                let segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
                checkAllEditable(sdk.DataModel.Junctions.getById({junctionId: segObj.junctionId}).segmentIds);
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

    function checkAllEditable(RASegs){
        var $RAEditable = $('#RAEditable');
        var allEditable = true;
        var segObj, fromNode, toNode;

        for(let i=0; i<RASegs.length;i++){
            segObj = sdk.DataModel.Segments.getById({segmentId: RASegs[i]})
            fromNode = sdk.DataModel.Nodes.getById({nodeId: segObj.fromNodeId});
            toNode = sdk.DataModel.Nodes.getById({nodeId: segObj.toNodeId});

            if(segObj !== "undefined"){
                // if(fromNode && fromNode !== "undefined" && !fromNode.areConnectionsEditable())
                //     allEditable = false;
                // else if(toNode && toNode !== "undefined" && !toNode.areConnectionsEditable())
                //     allEditable = false;
                var toConnected, fromConnected;

                if(toNode){
                    toConnected = toNode.connectedSegmentIds;
                    for(let j=0;j<toConnected.length;j++){
                        if(sdk.DataModel.Segments.getById({segmentId: toConnected[j]}) !== "undefined")
                            if(sdk.DataModel.Segments.getById({segmentId: toConnected[j]}).hasClosures)
                                allEditable = false;
                    }
                }

                if(fromNode){
                    fromConnected = fromNode.connectedSegmentIds;
                    for(let j=0;j<fromConnected.length;j++){
                        if(sdk.DataModel.Segments.getById({segmentId: fromConnected[j]}) !== "undefined")
                            if(sdk.DataModel.Segments.getById({segmentId: fromConnected[j]}).hasClosures)
                                allEditable = false;
                    }
                }
            }
        }
        if(allEditable)
            $RAEditable.remove();
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
        for (let segmentId of sdk.Editing.getSelection().ids){
            if(segmentId < 0 || !sdk.DataModel.Segments.getById({segmentId: segmentId}).junctionId)
                return false;
        }
        return true;
    }

    function ShiftSegmentNodesLat(segObj, latOffset){
        var RASegs = sdk.DataModel.Junctions.getById({junctionId: segObj.junctionId}).segmentIds;
        if(checkAllEditable(RASegs)){
            var newGeometry, originalLength;
            try {
                sdk.Editing.beginTransaction();

                for(let i=0; i<RASegs.length; i++){
                    segObj = sdk.DataModel.Segments.getById({segmentId: RASegs[i]});
                    newGeometry = structuredClone(segObj.geometry);
                    originalLength = segObj.geometry.coordinates.length;
                    for(j=1; j < originalLength-1; j++){
                        newGeometry.coordinates[j][1] += latOffset;
                    }
                    
                    sdk.DataModel.Segments.updateSegment({segmentId: segObj.id, geometry: newGeometry});

                    var node = sdk.DataModel.Nodes.getById({nodeId: segObj.toNodeId});
                    if(segObj.isBtoA)
                        node = sdk.DataModel.Nodes.getById({nodeId: segObj.fromNodeId});
                    var newNodeGeometry = structuredClone(node.geometry);
                    newNodeGeometry.coordinates[1] += latOffset;

                    var connectedSegObjs = {};
                    for(var j=0;j<node.connectedSegmentIds.length;j++){
                        var segid = node.connectedSegmentIds[j];
                        connectedSegObjs[segid] = structuredClone(sdk.DataModel.Segments.getById({segmentId: segid}).geometry);
                    }
                    sdk.DataModel.Nodes.moveNode({id: node.id, geometry: newNodeGeometry});
                    //totalActions +=2;
                }
                sdk.Editing.commitTransaction('Moved roundabout');
            } catch (error) {
                console.error(error);
                WazeWrap.Alerts.error('WME RA Util', 'An error occured while moving the roundabout vertically.');
                sdk.Editing.cancelTransaction();
            }
        }
    }

    function ShiftSegmentsNodesLong(segObj, longOffset){
        var RASegs = sdk.DataModel.Junctions.getById({junctionId: segObj.junctionId}).segmentIds;
        if(checkAllEditable(RASegs)){
            var newGeometry, originalLength;
            try {
                sdk.Editing.beginTransaction();

                //Loop through all RA segments & adjust
                for(let i=0; i<RASegs.length; i++){
                    segObj = sdk.DataModel.Segments.getById({segmentId: RASegs[i]});
                    newGeometry = structuredClone(segObj.geometry);
                    originalLength = segObj.geometry.coordinates.length;
                    for(let j=1; j < originalLength-1; j++){
                        newGeometry.coordinates[j][0] += longOffset;
                    }
                    
                    sdk.DataModel.Segments.updateSegment({segmentId: segObj.id, geometry: newGeometry});

                    var node = sdk.DataModel.Nodes.getById({nodeId: segObj.toNodeId});
                    if(segObj.isBtoA)
                        node = sdk.DataModel.Nodes.getById({nodeId: segObj.fromNodeId});

                    var newNodeGeometry = structuredClone(node.geometry);
                    newNodeGeometry.coordinates[0] += longOffset;

                    var connectedSegObjs = {};
                    for(let j=0;j<node.connectedSegmentIds.length;j++){
                        var segid = node.connectedSegmentIds[j];
                        connectedSegObjs[segid] = structuredClone(W.model.segments.getObjectById(segid).geometry);
                    }
                    sdk.DataModel.Nodes.moveNode({id: node.id, geometry: newNodeGeometry});
                    //totalActions +=2;
                }
                sdk.Editing.commitTransaction('Moved roundabout');
            } catch (error) {
                console.error(error);
                WazeWrap.Alerts.error('WME RA Util', 'An error occured while moving the roundabout horizontally.');
                sdk.Editing.cancelTransaction();
            }
        }
    }

    function rotatePointAroundCenter(point, center, angleDegrees) {
        const distance = turf.distance(center, point, {units: 'meters'});
        const currentBearing = turf.bearing(center, point);
        const newBearing = currentBearing - angleDegrees;
        
        return turf.destination(center, distance, newBearing, {units: 'meters'});
    }

    function RotateRA(segObj, angle){
        var RASegs = sdk.DataModel.Junctions.getById({junctionId: segObj.junctionId}).segmentIds;
        var raCenter = sdk.DataModel.Junctions.getById({junctionId: segObj.junctionId}).geometry.coordinates;

        if(checkAllEditable(RASegs)){
            var gps, newGeometry, originalLength;
            try {
                sdk.Editing.beginTransaction();

                //Loop through all RA segments & adjust
                for(let i=0; i<RASegs.length; i++){
                    segObj = sdk.DataModel.Segments.getById({segmentId: RASegs[i]});
                    newGeometry = structuredClone(segObj.geometry);
                    originalLength = segObj.geometry.coordinates.length;

                    for(let j=1; j<originalLength-1; j++){
                        const currentPoint = segObj.geometry.coordinates[j];
                        const rotatedPoint = rotatePointAroundCenter(currentPoint, raCenter, angle);
                        newGeometry.coordinates[j] = rotatedPoint.geometry.coordinates;
                    }

                    sdk.DataModel.Segments.updateSegment({segmentId: segObj.id, geometry: newGeometry});

                    //**************Rotate Nodes******************
                    var node = sdk.DataModel.Nodes.getById({nodeId: segObj.toNodeId});
                    if(segObj.isBtoA)
                        node = sdk.DataModel.Nodes.getById({nodeId: segObj.fromNodeId});

                    var newNodeGeometry = structuredClone(node.geometry);

                    const currentNodePoint = node.geometry.coordinates;
                    const rotatedNodePoint = rotatePointAroundCenter(currentNodePoint, raCenter, angle);
                    newNodeGeometry.coordinates = rotatedNodePoint.geometry.coordinates;

                    var connectedSegObjs = {};
                    for(let j=0;j<node.connectedSegmentIds.length;j++){
                        var segid = node.connectedSegmentIds[j];
                        connectedSegObjs[segid] = structuredClone(sdk.DataModel.Segments.getById({segmentId: segid}).geometry);
                    }
                    sdk.DataModel.Nodes.moveNode({id: node.id, geometry: newNodeGeometry});
                }
                sdk.Editing.commitTransaction('Rotated roundabout');
                
                if(_settings.RoundaboutAngles)
                    DrawRoundaboutAngles();
            } catch (error) {
                console.error(error);
                WazeWrap.Alerts.error('WME RA Util', 'An error occured while rotating the roundabout.');
                sdk.Editing.cancelTransaction();
            }
        }
    }

    function RARotateLeftBtnClick(e){
        e.stopPropagation();
        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        RotateRA(segObj, $('#rotationAmount').val());
    }

    function RARotateRightBtnClick(e){
        e.stopPropagation();

        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        RotateRA(segObj, -$('#rotationAmount').val());
    }

    function ChangeDiameter(segObj, amount){
        var RASegs = sdk.DataModel.Junctions.getById({junctionId: segObj.junctionId}).segmentIds;
        var raCenter = sdk.DataModel.Junctions.getById({junctionId: segObj.junctionId}).geometry.coordinates;

        if(checkAllEditable(RASegs)){
            var newGeometry, originalLength;
            try {
                sdk.Editing.beginTransaction();

                //Loop through all RA segments & adjust
                for(let i=0; i<RASegs.length; i++){
                    segObj = sdk.DataModel.Segments.getById({segmentId: RASegs[i]});
                    newGeometry = structuredClone(segObj.geometry);
                    originalLength = segObj.geometry.coordinates.length;

                    for(let j=1; j < originalLength-1; j++){
                        let pt = segObj.geometry.coordinates[j];
                        let currentDistance = turf.distance(raCenter, pt, {units: 'meters'});
                        let newDistance = currentDistance + amount;
                        let bearing = turf.bearing(raCenter, pt);
                        let newPoint = turf.destination(raCenter, newDistance, bearing, {units: 'meters'});
                        newGeometry.coordinates[j] = newPoint.geometry.coordinates;
                    }
                    sdk.DataModel.Segments.updateSegment({segmentId: segObj.id, geometry: newGeometry});

                    var node = sdk.DataModel.Nodes.getById({nodeId: segObj.toNodeId});
                    if(segObj.isBtoA)
                        node = sdk.DataModel.Nodes.getById({nodeId: segObj.fromNodeId});

                    var newNodeGeometry = structuredClone(node.geometry);
                    let currentNodeDistance = turf.distance(raCenter, newNodeGeometry.coordinates, {units: 'meters'});
                    let newNodeDistance = currentNodeDistance + amount;
                    let nodeBearing = turf.bearing(raCenter, newNodeGeometry.coordinates);
                    let newNodePoint = turf.destination(raCenter, newNodeDistance, nodeBearing, {units: 'meters'});
                    newNodeGeometry.coordinates = newNodePoint.geometry.coordinates;

                    var connectedSegObjs = {};
                    for(let j=0;j<node.connectedSegmentIds.length;j++){
                        var segid = node.connectedSegmentIds[j];
                        connectedSegObjs[segid] = structuredClone(sdk.DataModel.Segments.getById({segmentId: segid}).geometry);
                    }
                    sdk.DataModel.Nodes.moveNode({id: node.id, geometry: newNodeGeometry});
                }
                sdk.Editing.commitTransaction('Resized roundabout');
                
                if(_settings.RoundaboutAngles)
                    DrawRoundaboutAngles();
            } catch (error) {
                console.error(error);
                WazeWrap.Alerts.error('WME RA Util', 'An error occured while resizing the roundabout.');
                sdk.Editing.cancelTransaction();
            }
        }
    }

    function diameterChangeDecreaseBtnClick(e){
        e.stopPropagation();
        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        ChangeDiameter(segObj, -1);
    }

    function diameterChangeIncreaseBtnClick(e){
        e.stopPropagation();
        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        ChangeDiameter(segObj, 1);
    }

    function moveNodeIn(sourceSegID, nodeID){
        let isANode = true;
        let curSeg = sdk.DataModel.Segments.getById({segmentId: sourceSegID});
        if (curSeg.geometry.coordinates.length > 2) {
            if(nodeID === curSeg.toNodeId)
                isANode = false;
            //Add geo point on the other segment
            let node = sdk.DataModel.Nodes.getById({nodeId: nodeID});
            let otherSeg; //other RA segment that we are adding a geo point to
            let nodeSegs = [...node.connectedSegmentIds];
            nodeSegs = _.without(nodeSegs, sourceSegID); //remove the source segment from the node Segs - we need to find the segment that is a part of the RA that is prior to our source seg
            for(let i=0; i<nodeSegs.length; i++){
                let s = sdk.DataModel.Segments.getById({segmentId: nodeSegs[i]});
                if(s.junctionId){
                    otherSeg = s;
                    break;
                }
            }

            try {
                sdk.Editing.beginTransaction();
                //note and remove first geo point, move junction node to this point
                var newNodeGeometry = { type: 'Point', coordinates: structuredClone(curSeg.geometry.coordinates[isANode ? 1 : curSeg.geometry.coordinates.length - 2]) };

                let newCurGeometry = structuredClone(curSeg.geometry);
                newCurGeometry.coordinates.splice(isANode ? 1 : newCurGeometry.coordinates.length - 2, 1);
                sdk.DataModel.Segments.updateSegment({segmentId: curSeg.id, geometry: newCurGeometry});

                //move the node
                var connectedSegObjs = {};
                for(var j=0;j<node.connectedSegmentIds.length;j++){
                    var segid = node.connectedSegmentIds[j];
                    connectedSegObjs[segid] = structuredClone(sdk.DataModel.Segments.getById({segmentId: segid}).geometry);
                }
                sdk.DataModel.Nodes.moveNode({id: node.id, geometry: newNodeGeometry});

                if((otherSeg.isBtoA && !curSeg.isBtoA) || (!otherSeg.isBtoA && curSeg.isBtoA))
                        isANode = !isANode;

                let newOtherGeometry = structuredClone(otherSeg.geometry);
                newOtherGeometry.coordinates.splice(isANode ? newOtherGeometry.coordinates.length : 0, 0, [newNodeGeometry.coordinates[0], newNodeGeometry.coordinates[1]]);
                
                sdk.DataModel.Segments.updateSegment({segmentId: otherSeg.id, geometry: newOtherGeometry});
                sdk.Editing.commitTransaction('Moved roundabout node in');
                
                if(_settings.RoundaboutAngles)
                    DrawRoundaboutAngles();
            } catch (error) {
                console.error(error);
                WazeWrap.Alerts.error('WME RA Util', 'An error occured while moving a node in.');
                sdk.Editing.cancelTransaction();
            }
        }
    }

    function moveNodeOut(sourceSegID, nodeID){
        let isANode = true;
        let curSeg = sdk.DataModel.Segments.getById({segmentId: sourceSegID});
        if(nodeID === curSeg.toNodeId)
            isANode = false;
        //Add geo point on the other segment
        let node = sdk.DataModel.Nodes.getById({nodeId: nodeID});
        let currNodePOS = structuredClone(node.geometry.coordinates);
        let otherSeg; //other RA segment that we are adding a geo point to
        let nodeSegs = [...node.connectedSegmentIds];
        nodeSegs = _.without(nodeSegs, sourceSegID); //remove the source segment from the node Segs - we need to find the segment that is a part of the RA that is after our source seg
        for(let i=0; i<nodeSegs.length; i++){
            let s = sdk.DataModel.Segments.getById({segmentId: nodeSegs[i]});
            if(s.junctionId){
                otherSeg = s;
                break;
            }
        }

        if(otherSeg.geometry.coordinates.length > 2){
            try {
                sdk.Editing.beginTransaction();
                let newCurGeometry = structuredClone(curSeg.geometry);
                newCurGeometry.coordinates.splice(isANode ? 1 : newCurGeometry.coordinates.length - 1, 0, [currNodePOS[0], currNodePOS[1]]);
                sdk.DataModel.Segments.updateSegment({segmentId: curSeg.id, geometry: newCurGeometry});
                if((otherSeg.isBtoA && !curSeg.isBtoA) || (!otherSeg.isBtoA && curSeg.isBtoA))
                    isANode = !isANode;

                //note and remove first geo point, move junction node to this point
                var newNodeGeometry = { type: 'Point', coordinates: structuredClone(otherSeg.geometry.coordinates[isANode ? otherSeg.geometry.coordinates.length - 2 : 1]) };
                let newOtherGeometry = structuredClone(otherSeg.geometry);
                newOtherGeometry.coordinates.splice(isANode ? -2 : 1, 1);
                sdk.DataModel.Segments.updateSegment({segmentId: otherSeg.id, geometry: newOtherGeometry});

                //move the node
                var connectedSegObjs = {};
                for(var j=0; j < node.connectedSegmentIds.length;j++){
                    var segid = node.connectedSegmentIds[j];
                    connectedSegObjs[segid] = structuredClone(sdk.DataModel.Segments.getById({segmentId: segid}).geometry);
                }
                sdk.DataModel.Nodes.moveNode({id: node.id, geometry: newNodeGeometry});
                sdk.Editing.commitTransaction('Moved roundabout node out');
                
                if(_settings.RoundaboutAngles)
                    DrawRoundaboutAngles();
            } catch (error) {
                console.error(error);
                WazeWrap.Alerts.error('WME RA Util', 'An error occured while moving a node out.');
                sdk.Editing.cancelTransaction();
            }
        }
    }

    //Left
    function RAShiftLeftBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        var convertedCoords = WazeWrap.Geometry.ConvertTo4326(segObj.geometry.coordinates[0][0], segObj.geometry.coordinates[0][1]);
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLongOffsetGPS(-$('#shiftAmount').val(), convertedCoords.lon, convertedCoords.lat);
        ShiftSegmentsNodesLong(segObj, gpsOffsetAmount);
        //}
    }
    //Right
    function RAShiftRightBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        var convertedCoords = WazeWrap.Geometry.ConvertTo4326(segObj.geometry.coordinates[0][0], segObj.geometry.coordinates[0][1]);
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLongOffsetGPS($('#shiftAmount').val(), convertedCoords.lon, convertedCoords.lat);
        ShiftSegmentsNodesLong(segObj, gpsOffsetAmount);
        //}
    }
    //Up
    function RAShiftUpBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLatOffsetGPS($('#shiftAmount').val(), WazeWrap.Geometry.ConvertTo4326(segObj.geometry.coordinates[0][0], segObj.geometry.coordinates[0][1]));
        ShiftSegmentNodesLat(segObj, gpsOffsetAmount);
        //}
    }
    //Down
    function RAShiftDownBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = sdk.DataModel.Segments.getById({segmentId: sdk.Editing.getSelection().ids[0]});
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLatOffsetGPS(-$('#shiftAmount').val(), WazeWrap.Geometry.ConvertTo4326(segObj.geometry.coordinates[0][0], segObj.geometry.coordinates[0][1]));
        ShiftSegmentNodesLat(segObj, gpsOffsetAmount);
        //}
    }

    //*************** Roundabout Angles **********************
    function DrawRoundaboutAngles(){
        sdk.Map.setLayerVisibility({layerName: "__DrawRoundaboutAngles", visibility: true})
        
        localStorage.WMERAEnabled = sdk.Map.isLayerVisible({layerName: "__DrawRoundaboutAngles"});

        if (sdk.Map.isLayerVisible({layerName: "__DrawRoundaboutAngles"}) == false) {
            sdk.Map.removeAllFeaturesFromLayer({layerName: "__DrawRoundaboutAngles"});
            return;
        }

        if (sdk.Map.getZoomLevel() < 16) {
            sdk.Map.removeAllFeaturesFromLayer({layerName: "__DrawRoundaboutAngles"});
            return;
        }

        //---------collect all roundabouts first
        var rsegments = {};

        for (let isegment of sdk.DataModel.Segments.getAll()) {
            let irid = isegment.junctionId;
            
            if (irid) {
                if (rsegments[irid] == undefined)
                    rsegments[irid] = new Array();
                rsegments[irid].push(isegment);
            }
        }

        var drc_features = [];

        //-------for each roundabout do...
        for (let irid in rsegments) {
            let rsegs = rsegments[irid];

            let isegment = rsegs[0];

            let nodes = [];
            let nodes_x = [];
            let nodes_y = [];

            nodes = rsegs.map(seg => seg.fromNodeId); //get from nodes
            nodes = [...nodes, ...rsegs.map(seg => seg.toNodeId)]; //get to nodes add to from nodes
            nodes = _.uniq(nodes); //remove duplicates

            let node_coordinates = nodes.map(nodeId => sdk.DataModel.Nodes.getById({nodeId}).geometry.coordinates);
            // nodes_x = node_coordinates.map(coord => coord[0]); //get all x locations
            // nodes_y = node_coordinates.map(coord => coord[1]); //get all y locations

            let sr_x = 0;
            let sr_y = 0;
            let radius = 0;
            let numNodes = node_coordinates.length;

            if (numNodes >= 1) {
                let ax = nodes_x[0];
                let ay = nodes_y[0];
                let junction = sdk.DataModel.Junctions.getById({junctionId: parseInt(irid)});
                let centerCoordinate = junction.geometry.coordinates;
                //var junction_coords = junction && junction.getOLGeometry() && junction.getOLGeometry().coordinates;

//                if (junction_coords && junction_coords.length == 2) {
                    //---------- get center point from junction model
                    //let lonlat = new OpenLayers.LonLat(junction_coords[0], junction_coords[1]);
                    //lonlat.transform(W.Config.map.projection.remote, W.Config.map.projection.local);
                    //let pt = new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
                    // sr_x = junction.getOLGeometry().x;
                    // sr_y = junction.getOLGeometry().y;
/**                }
                else if (numNodes >= 3) {
                    //-----------simple approximation of centre point calculated from three first points
                    let bx = nodes_x[1];
                    let by = nodes_y[1];
                    let cx = nodes_x[2];
                    let cy = nodes_y[2];

                    let x1 = (bx + ax) * 0.5;
                    let y11 = (by + ay) * 0.5;
                    let dy1 = bx - ax;
                    let dx1 = -(by - ay);
                    let x2 = (cx + bx) * 0.5;
                    let y2 = (cy + by) * 0.5;
                    let dy2 = cx - bx;
                    let dx2 = -(cy - by);
                    sr_x = (y11 * dx1 * dx2 + x2 * dx1 * dy2 - x1 * dy1 * dx2 - y2 * dx1 * dx2)/ (dx1 * dy2 - dy1 * dx2);
                    sr_y = (sr_x - x1) * dy1 / dx1 + y11;
                }
                else {
                    //---------- simple bounds-based calculation of center point
                    var rbounds = new OpenLayers.Bounds();
                    rbounds.extend(isegment.getOLGeometry().bounds);

                    var center = rbounds.getCenterPixel();
                    sr_x = center.x;
                    sr_y = center.y;
                }**/

                let angles = [];
                let rr = -1;
                let r_ix;

                for(let i=0; i<node_coordinates.length; i++) {

                    let rr2 = turf.distance(centerCoordinate, node_coordinates[i], {units: 'meters'});
                    if (rr < rr2) {
                        rr = rr2;
                        r_ix = i;
                    }

                    let angle = turf.bearing(centerCoordinate, node_coordinates[i]);
                    if (angle < 0.0) angle += 360.0;
                    if (angle > 360.0) angle -= 360.0;
                    angles.push(angle);
                }

                radius = rr;

                //---------sorting angles for calulating angle difference between two segments
                angles = angles.sort(function(a,b) { return a - b; });
                angles.push( angles[0] + 360.0);
                angles = angles.sort(function(a,b) { return a - b; });

                let drc_color = (numNodes <= 4) ? "#0040FF" : "#002080";

                let circle = turf.circle(centerCoordinate, radius, {units: 'meters', steps: sdk.Map.getZoomLevel() * 5});
                let circleFeature = turf.polygon(circle.geometry.coordinates, {styleName: 'roundaboutCircleStyle', layerName: '__DrawRoundaboutAngles', style: {strokeColor: drc_color}}, {id: `polygon_${centerCoordinate.toString()}_${radius}`});
                drc_features.push(circleFeature);


                if (numNodes >= 2 && numNodes <= 4 && sdk.Map.getZoomLevel() >= 5) {
                    for(let i=0; i<node_coordinates.length; i++) {
                        let lineFeature = turf.lineString([centerCoordinate, node_coordinates[i]], {styleName: 'roundaboutLineStyle', layerName: '__DrawRoundaboutAngles', style: {strokeColor: drc_color}}, {id: `line_${[centerCoordinate, node_coordinates[i]].toString()}`});
                        drc_features.push(lineFeature);
                    }

                    let angles_int = [];
                    let angles_float = [];
                    let angles_sum = 0;

                    for(let i=0; i<angles.length - 1; i++) {

                        let ang = angles[i+1] - angles[i+0];
                        if (ang < 0) ang += 360.0;
                        if (ang < 0) ang += 360.0;

                        if (ang < 135.0)
                            ang = ang - 90.0;
                        else
                            ang = ang - 180.0;

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
                        for(let i=0; i<angles_int.length; i++) {
                            let a = angles_int[i];
                            let af = angles_float[i] - angles_int[i];
                            if ( (a < 10 || a > 20) && (af < -0.5 || af > 0.5)){
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
                        let labelDistance = radius / 2;
                        let labelPoint = turf.destination(centerCoordinate, labelDistance, (angles[i+0] + angles[i+1]) * 0.5, {units: 'meters'});

                        //*** Angle Display Rounding ***
                        let angint = Math.round(angles_float[i] * 100)/100;

                        let kolor = "#004000";
                        if (angint <= -15 || angint >= 15) kolor = "#FF0000";
                        else if (angint <= -13 || angint >= 13) kolor = "#FFC000";

                        let labelFeature = turf.point(labelPoint.geometry.coordinates, {styleName: 'roundaboutLabelStyle', layerName: '__DrawRoundaboutAngles', style: {labelText: angint + "°", labelColor: kolor}}, {id: `label_${labelPoint.geometry.coordinates.toString()}`});
                        drc_features.push(labelFeature);
                    }
                }
                else {
                    for(let i=0; i < node_coordinates.length; i++) {
                        let lineFeature = turf.lineString([centerCoordinate, node_coordinates[i]], {styleName: 'roundaboutLineStyle', layerName: '__DrawRoundaboutAngles', style: {strokeColor: drc_color}}, {id: `line_${[centerCoordinate, node_coordinates[i]].toString()}`});
                        drc_features.push(lineFeature);
                    }
                }

                let centerLabelFeature = turf.point(centerCoordinate, {styleName: 'roundaboutLabelStyle', layerName: '__DrawRoundaboutAngles', style: {labelText: (radius * 2.0).toFixed(0) + "m", labelColor: "#000000"}}, {id: `centerLabel_${centerCoordinate.toString()}`});
                drc_features.push(centerLabelFeature);

            }

        }

        console.log(drc_features)
        sdk.Map.removeAllFeaturesFromLayer({layerName: "__DrawRoundaboutAngles"});
        sdk.Map.addFeaturesToLayer({layerName: "__DrawRoundaboutAngles", features: drc_features});
    }

    function injectCss() {
        var css = [
            '.btnMoveNode {width=25px; height=25px; background-color:#92C3D3; cursor:pointer; padding:5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius:50%; -moz-border-radius:50%; -webkit-border-radius:50%; box-shadow:inset 0px 0px 20px -14px rgba(0,0,0,1); -moz-box-shadow:inset 0px 0px 20px -14px rgba(0,0,0,1); -webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);}',
            '.btnRotate { width=45px; height=45px; background-color:#92C3D3; cursor:pointer; padding: 5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);}'
        ].join(' ');
        $('<style type="text/css">' + css + '</style>').appendTo('head');
    }

    function applyRoundaboutCircleStyle(properties) {
        return properties.styleName === "roundaboutCircleStyle" && properties.layerName === "__DrawRoundaboutAngles";
    }

    function applyRoundaboutLineStyle(properties) {
        return properties.styleName === "roundaboutLineStyle" && properties.layerName === "__DrawRoundaboutAngles";
    }

    function applyRoundaboutLabelStyle(properties) {
        return properties.styleName === "roundaboutLabelStyle" && properties.layerName === "__DrawRoundaboutAngles";
    }

    const styleConfig = {
        styleContext: {
            labelText: (context) => {
                return context?.feature?.properties?.style?.labelText;
            },
            strokeColor: (context) => {
                return context?.feature?.properties?.style?.strokeColor;
            },
            strokeWidth: (context) => {
                return context?.feature?.properties?.style?.strokeWidth;
            },
            labelColor: (context) => {
                return context?.feature?.properties?.style?.labelColor;
            }
        },
        styleRules: [
            {
                predicate: applyRoundaboutCircleStyle,
                style: {
                    fillOpacity: 0.0,
                    fillColor: "#FF40C0",
                    strokeWidth: 10,
                    strokeColor: "${strokeColor}",
                    pointRadius: 0,
                },
            },
            {
                predicate: applyRoundaboutLineStyle,
                style: {
                    strokeWidth: 2,
                    strokeColor: "${strokeColor}",
                    pointRadius: 0,
                },
            },
            {
                predicate: applyRoundaboutLabelStyle,
                style: {
                    label: "${labelText}",
                    labelOutlineColor: "#FFFFFF",
                    labelOutlineWidth: 3,
                    fontFamily: "Tahoma, Courier New",
                    fontWeight: "bold",
                    fontColor: "${labelColor}",
                    fontSize: "10px"
                },
            }
        ],
    };
})();


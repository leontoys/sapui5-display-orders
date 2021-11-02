sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller"
], function (JSONModel, Controller) {
	"use strict";

	return Controller.extend("displayorders.controller.App", {
		onInit: function () {
            var oViewModel,
                fnSetAppNotBusy,
                iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0,
				layout: "OneColumn",
				previousLayout: "",
				actionButtonsInfo: {
					midColumn: {
						fullScreen : false
					}
				}
			});

            this.getView().setModel(oViewModel, "appView");

            fnSetAppNotBusy = function () {
                oViewModel.setProperty("/busy", false);
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            };

            // since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
            this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy);
            this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

            // apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());            
        },
        
        onStateChange: function (oEvent) {
            // var sLayout = oEvent.getParameter("layout"),
            //     iColumns = oEvent.getParameter("maxColumnsCount");
            // 
            // if (iColumns === 1) {
            //     this.getModel("layout").setProperty("/smallScreenMode", true);
            // } 
            // else {
            //     this.getModel("layout").setProperty("/smallScreenMode", false);

            //     if (sLayout === "OneColumn") {
            //         this._setLayout("Two");
            //     }
            // }
        },
        
        _setLayout: function (sColumns) {
            // if (sColumns) {
            //     this.getModel("layout").setProperty("/layout", sColumns + "Column" + (sColumns === "One" ? "" : "sMidExpanded"));
            // }
        }        
	});
});
    
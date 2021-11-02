sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "sap/ui/core/Fragment"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (BaseController, JSONModel, Filter, Sorter, FilterOperator, Device, Fragment) {
		"use strict";

		return BaseController.extend("displayorders.controller.OrdersOverview", {
			onInit: function () {
                var oList = this.byId("list"),
                    oViewModel = this._createViewModel(),
                    // Put down master list's original value for busy indicator delay,
                    // so it can be restored later on. Busy handling on the master list is
                    // taken care of by the master list itself.
                    iOriginalBusyDelay = oList.getBusyIndicatorDelay();

                this._oList = oList;

                this._oListFilterState = {
                    aFilter: [],
                    aSearch: []
                };

                this.setModel(oViewModel, "masterView");

                // Make sure, busy indication is showing immediately so there is no
                // break after the busy indication for loading the view's meta data is
                // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
                oList.attachEventOnce("updateFinished", function(){
                    // Restore original busy indicator delay for the list
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                });

                this.getView().addEventDelegate({
                    onBeforeFirstShow: function () {
                        this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
                    }.bind(this)
                });

                // this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
                // this.getRouter().attachBypassed(this.onBypassed, this);                
            },            

            /* =========================================================== */
            /* event handlers                                              */
            /* =========================================================== */

            onSearch: function (oEvent) {
                var sQuery = oEvent.getParameter("query");

                if (sQuery) {
                    this._oListFilterState.aSearch = [new Filter("OrderID", FilterOperator.EQ, sQuery)];
                } 
                else {
                    this._oListFilterState.aSearch = [];
                }

                this._applyFilterSearch();
            },

            onSelectionChange: function (oEvent) {
                var oList = oEvent.getSource(),
                    bSelected = oEvent.getParameter("selected");

                // skip navigation when deselecting an item in multi selection mode
                if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
                    // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
                    this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
                }                
            },

            onUpdateFinished: function (oEvent) {
                var iTotalItems = oEvent.getParameter("total");
                var sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
                this.getModel("masterView").setProperty("/title", sTitle);
            },

            onOpenViewSettings: function (oEvent) {
                var sDialogTab = "filter";
                if (oEvent.getSource() instanceof sap.m.Button) {
                    var sButtonId = oEvent.getSource().getId();

                    if (sButtonId.match("sort")) {
                        sDialogTab = "sort";
                    } 
                    else if (sButtonId.match("group")) {
                        sDialogTab = "group";
                    }
                }

                // load asynchronous XML fragment
                if (!this.byId("sortingOrdersDialog")) {
                    Fragment.load({
                        id: this.getView().getId(),
                        name: "displayorders.view.SortingOrdersDialog",
                        controller: this
                    }).then(function(oDialog){
                        // connect dialog to the root view of this component (models, lifecycle)
                        this.getView().addDependent(oDialog);
                        oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                        oDialog.open(sDialogTab);
                    }.bind(this));
                } 
                else {
                    this.byId("sortingOrdersDialog").open(sDialogTab);
                }
            },

            onConfirmSortingOrdersDialog: function (oEvent) {
                this._applySortGroup(oEvent);
            },

            _applySortGroup: function (oEvent) {
                var mParams = oEvent.getParameters(),
                    sPath,
                    bDescending,
                    aSorters = [];
                sPath = mParams.sortItem.getKey();
                bDescending = mParams.sortDescending;
                aSorters.push(new Sorter(sPath, bDescending));
                this._oList.getBinding("items").sort(aSorters);
            },

            /* =========================================================== */
            /* begin: internal methods                                     */
            /* =========================================================== */

            _createViewModel: function() {
                return new JSONModel({
                    isFilterBarVisible: false,
                    filterBarLabel: "",
                    delay: 0,
                    title: this.getResourceBundle().getText("masterTitleCount", [0]),
                    noDataText: this.getResourceBundle().getText("masterListNoDataText"),
                    sortBy: "OrderID",
                    groupBy: "None"
                });
            },

            _showDetail: function (oItem) {
                var bReplace = !Device.system.phone;
                // set the layout property of FCL control to show two columns
                this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
                this.getRouter().navTo("viewOrderDetail", {
                    orderID: oItem.getBindingContext().getProperty("OrderID")
                }, bReplace);
            },

            _applyFilterSearch: function () {
                // var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter);
                var aFilters = this._oListFilterState.aSearch;
                var oViewModel = this.getModel("masterView");

                this._oList.getBinding("items").filter(aFilters, "Application");
                
                // changes the noDataText of the list in case there are no filter results
                if (aFilters.length !== 0) {
                    oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
                } 
                else if (this._oListFilterState.aSearch.length > 0) {
                    // only reset the no data text to default when no new search was triggered
                    oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
                }
            }
		});
	});

    
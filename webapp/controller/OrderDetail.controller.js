sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (BaseController, JSONModel, formatter) {
		"use strict";

        function _calculateOrderTotal (fPreviousTotal, oCurrentContext) {
            var fItemTotal = oCurrentContext.getObject().Quantity * oCurrentContext.getObject().UnitPrice;
            return fPreviousTotal + fItemTotal;
        }

		return BaseController.extend("displayorders.controller.OrderDetail", {

            formatter: formatter,

            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */

            onInit: function () {
                // Model used to manipulate control states. The chosen values make sure,
                // detail page is busy indication immediately so there is no break in
                // between the busy indication for loading the view's meta data
                var oViewModel = new JSONModel({
                    busy: false,
                    delay: 0,
                    // Set fixed currency on view model (as the OData service does not provide a currency).
                    currency: "EUR"
                });

                this.getRouter().getRoute("viewOrderDetail").attachPatternMatched(this._onObjectMatched, this);
                this.setModel(oViewModel, "detailView");
                this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
            },

            /* =========================================================== */
            /* event handlers                                              */
            /* =========================================================== */

            /**
             * Event handler when the share by E-Mail button has been clicked
             * @public
             */
            onSendEmailPress: function () {
            },

            /**
             * Updates the item count within the line item table's header
             * @param {object} oEvent an event containing the total number of items in the list
             * @private
             */
            onListUpdateFinished : function (oEvent) {
                var sTitle,
                    fOrderTotal = 0,
                    iTotalItems = oEvent.getParameter("total"),
                    oViewModel = this.getModel("detailView"),
                    oItemsBinding = oEvent.getSource().getBinding("items"),
                    aItemsContext;

                // only update the counter if the length is final
                if (oItemsBinding.isLengthFinal()) {
                    if (iTotalItems) {
                        sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
                    } 
                    else {
                        //Display 'Orders Items' instead of 'Orders Items (0)'
                        sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
                    }
                    oViewModel.setProperty("/lineItemListTitle", sTitle);

                    aItemsContext = oItemsBinding.getContexts();
                    fOrderTotal = aItemsContext.reduce(_calculateOrderTotal, 0);
                    oViewModel.setProperty("/totalOrderAmount", fOrderTotal);
                }
            },

            /**
             * Set the full screen mode to false and navigate to master page
             */
            onCloseDetailPress: function () {
                this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
                
                // No item should be selected on master after detail page is closed
                this.getOwnerComponent().oListSelector.clearMasterListSelection();

                this.getRouter().navTo("viewOrdersOverview");
                this.getModel("appView").setProperty("/layout", "OneColumn");
            },

            /**
             * Toggle between full and non full screen mode.
             */
            toggleFullScreen: function () {
                var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
                this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);

                if (!bFullScreen) {
                    // store current layout and go full screen
                    this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                    this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
                } 
                else {
                    // reset to previous layout
                    this.getModel("appView").setProperty("/layout",  this.getModel("appView").getProperty("/previousLayout"));
                }
            },

            /* =========================================================== */
            /* begin: internal methods                                     */
            /* =========================================================== */

            /**
             * Binds the view to the object path and expands the aggregated line items.
             * @function
             * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
             * @private
             */
            _onObjectMatched: function (oEvent) {
                var sObjectId =  oEvent.getParameter("arguments").orderID;
                this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
                this.getModel().metadataLoaded().then(function() {
                    var sObjectPath = this.getModel().createKey("Orders", {
                        OrderID: sObjectId
                    });
                    this._bindView("/" + sObjectPath);
                }.bind(this));
            },

            /**
             * Binds the view to the object path. Makes sure that detail view displays
             * a busy indicator while data for the corresponding element binding is loaded.
             * @function
             * @param {string} sObjectPath path to the object to be bound to the view.
             * @private
             */
            _bindView: function (sObjectPath) {
                // Set busy indicator during view binding
                var oViewModel = this.getModel("detailView");

                // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
                oViewModel.setProperty("/busy", false);

                this.getView().bindElement({
                    path: sObjectPath,
                    parameters: {
                        expand: "Customer,Order_Details/Product,Employee"
                    },
                    events: {
                        change: this._onBindingChange.bind(this),
                        dataRequested: function () {
                            oViewModel.setProperty("/busy", true);
                        },
                        dataReceived: function () {
                            oViewModel.setProperty("/busy", false);
                        }
                    }
                });

                // var oIconTabFilter = this.getView().byId("customerDetailsIconTabFilter");
                // var oForm = oIconTabFilter.getContent()[0];

                // oForm.bindElement(sObjectPath, {
                //     expand: 'Customer, Employee'
                // });
            },

            _onBindingChange: function () {
                var oView = this.getView(),
                    oElementBinding = oView.getElementBinding();

                // No data for the binding
                if (!oElementBinding.getBoundContext()) {
                    this.getRouter().getTargets().display("detailObjectNotFound");

                    // if object could not be found, the selection in the master list
                    // does not make sense anymore.
                    this.getOwnerComponent().oListSelector.clearMasterListSelection();

                    return;
                }

                var sPath = oElementBinding.getPath();
                this.getOwnerComponent().oListSelector.selectAListItem(sPath);                
            },

            _onMetadataLoaded: function () {
                // Store original busy indicator delay for the detail view
                var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                    oViewModel = this.getModel("detailView");

                // Make sure busy indicator is displayed immediately when
                // detail view is displayed for the first time
                oViewModel.setProperty("/delay", 0);

                // Binding the view will set it to not busy - so the view is always busy if it is not bound
                oViewModel.setProperty("/busy", true);
                // Restore original busy indicator delay for the detail view
                oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
            }
        });
	});

    
//######################################################################################################## 
//#                                                                                                    #\\
//#                      LANDTRENDR CHANGE DETECTION USING OPTIMIZATION OUTPUTS                        #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-02-18
// author: Ben Roberts-Pierel | robertsb@oregonstate.edu
//         Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE


//  This program takes seven inputs:
// 1. The LT-like output that is the result of the 06lt_TransferFTV.js script
// 2. LandTrendr.js modules, this is where we get the change detection code from for making maps 
// 3. Start year, this should be the first year in your image stack 
// 4. End year, this should be the final year of your image stack 
// 5. Change detection paramaters- see https://emapr.github.io/LT-GEE/ui-applications.html#ui-landtrendr-change-mapper and 
//    https://emapr.github.io/LT-GEE/api.html#getchangemap for more information 

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
Map.centerObject(ee.Geometry.Point([103.04024450997451, 19.0519345305046]),12); 

//test an output from the previous script to make sure it looks like the regular output without exporting
var lt_out = ee.Image('users/ak_glaciers/NBR_fit_LandTrendr_like_output'); 
Map.addLayer(lt_out,{},'nbr')
//import the LandTrendr modules
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

var startYear = 2000; 
var endYear = 2020; 

//change detection params 
var changeParams = {
  delta:  'loss',
  sort:   'greatest',
  year:   {checked:false, start:2000, end:2020},
  mag:    {checked:true, value:10,  operator:'>'},
  dur:    {checked:false, value:4,    operator:'<'},
  preval: {checked:false, value:300,  operator:'>'},
  mmu:    {checked:false, value:1},
};

///////////////////////////////////////////////////////////////////////////////////
//make a change detection map using the LandTrendr modules 

//this is an issue because we used different fitting indices and so the changeParams are adjusted according to that...
var index = 'B5';

// add index to changeParams object
changeParams.index = index;

// get the change map layers
var changeImg = ltgee.getChangeMap(lt_out, changeParams);

print(changeImg)

// set visualization dictionaries
var palette = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000'];
var yodVizParms = {
  min: startYear,
  max: endYear,
  palette: palette
};

var magVizParms = {
  min: 200,
  max: 800,
  palette: palette
}; 

// display the change attribute map - note that there are other layers - print changeImg to console to see all
Map.addLayer(changeImg.select(['mag']), magVizParms, 'Magnitude of Change');
Map.addLayer(changeImg.select(['yod']), yodVizParms, 'Year of Detection');

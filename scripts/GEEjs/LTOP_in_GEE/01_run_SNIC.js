//######################################################################################################## 
//#                                                                                                    #\\
//#                              Step 1 LandTrendr Optimization workflow                               #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-09-02  
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/ak_glaciers/adpc_servir_LTOP:modules/LandTrendr.js'); 
var ltop = require('users/ak_glaciers/adpc_servir_LTOP:modules/LTOP_modules.js'); 
var params = require('users/ak_glaciers/adpc_servir_LTOP:modules/params.js'); 

print('You are currently running version: ',params.version,' of the LTOP workflow'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var annualSRcollection; 

if (image_source == 'medoid'){

  var imageEnd = ltgee.buildSRcollection(2021, 2021, startDate, endDate, aoi, masked).mosaic(); 
  var imageMid = ltgee.buildSRcollection(2005, 2005, startDate, endDate, aoi, masked).mosaic();
  var imageStart = ltgee.buildSRcollection(1990, 1990, startDate, endDate, aoi, masked).mosaic();

//get servir (or other) image composites   
}else if (image_source != 'medoid'){
  
  var comps = ltop.buildSERVIRcompsIC(startYear,endYear); 
  
  //now make an image out of a start, mid and end point of the time series 
  var imageEnd = comps.filter(ee.Filter.eq('system:index','2021')).first();
  var imageMid = comps.filter(ee.Filter.eq('system:index','2005')).first();
  var imageStart = comps.filter(ee.Filter.eq('system:index','1990')).first();
  }
var LandsatComposites = imageEnd.addBands(imageMid).addBands(imageStart); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
// 1. run the snic algorithm 
var snic_output01 = ltop.snic01(LandsatComposites,params.aoi,params.randomPts,params.seedSpacing); 

Export.table.toAsset({
              collection: snic_output01.get(0), 
              description:"LTOP_SNIC_pts_"+params.place+"_c2_"+params.randomPts.toString()+"_pts_"+params.startYear.toString(), 
              assetId:assets_child+"/LTOP_SNIC_pts_"+params.place+"_c2_"+params.randomPts.toString()+"_pts_"+params.startYear.toString(), 
              
  }); 
  
Export.image.toAsset({
              image: snic_output01.get(1), 
              description:"LTOP_SNIC_imagery_"+params.place+"_c2_"+params.randomPts.toString()+"_pts_"+params.startYear.toString(), 
              assetId:assets_child+"/LTOP_SNIC_imagery_"+params.place+"_c2_"+params.randomPts.toString()+"_pts_"+params.startYear.toString(), 
              region:aoi, 
              scale:30,
              maxPixels:1e13, 
  }); 


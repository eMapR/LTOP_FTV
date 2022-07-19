
//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LandTrendr Optimization workflow                           #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ltop = require('users/emaprlab/public:Modules/LTOP_modules.js')

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var str_start = '1990'; 
var place = 'Cambodia'; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'servir_training_tests'; 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
// 2. cluster the snic patches with kmeans 
var kmeans_output02 = ltop.kmeans02(ee.FeatureCollection(assets_root+assets_child+"/LTOP_SNIC_pts_"+place+"_c2_mapped_tile_"+str_start),
                                ee.Image(assets_root+assets_child+"/LTOP_SNIC_imagery_"+place+"_c2_mapped_tile_"+str_start),
                                aoi); 
//export the kmeans output image to an asset
Export.image.toAsset({
            image: kmeans_output02.get(0), 
            description:"LTOP_kmeans_cluster_image_"+place+"_c2_"+str_start, 
            assetId:assets_child+"/LTOP_kmeans_cluster_image_"+place+"_c2_"+str_start, 
            region:aoi, 
            scale:30,
            maxPixels:1e13, 
}); 

//export a fc with one point for every unique cluster id in the kmeans output
Export.table.toAsset({
            collection:ee.FeatureCollection(kmeans_output02.get(1)),
            description: 'LTOP_'+place+'_kmeans_stratified_random_cluster_points', 
            assetId:assets_child+'/LTOP_'+place+'_kmeans_stratified_random_cluster_points'
}); 
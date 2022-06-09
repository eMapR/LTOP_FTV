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
var ltop = require('users/emaprlab/broberts:LTOP_mekong/LTOP_modules')

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//these date windows are specific to the place that you're working on
var str_start = '1990'; 
var place = 'Cambodia'; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'gee_LTOP_conversion'; 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// File Management/////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//let GEE create a new assets folder for you that will hold all the outputs of this run 
// ee.data.createFolder(assets_root+assets_child)	

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

// 2. cluster the snic patches with kmeans 
var kmeans_output02 = ltop.kmeans02(ee.FeatureCollection(assets_root+assets_child+"/LTOP_snic_pts_"+place+"_c2_mapped_tile_"+str_start),
                                ee.Image(assets_root+assets_child+"/LTOP_snic_imagery_"+place+"_c2_mapped_tile_"+str_start),
                                aoi); 

// export the kmeans output image to an asset
Export.image.toAsset({
            image: kmeans_output02.get(0), 
            description:"LTOP_kmeans_cluster_image_"+place+"_c2_full_area"+str_start, 
            assetId:assets_child+"/LTOP_kmeans_cluster_image_"+place+"_c2_full_area_50_per_tiled_"+str_start, 
            region:aoi, 
            scale:30,
            maxPixels:1e13, 
}); 
  
Export.table.toAsset({
            collection:kmeans_output02.get(1),
            description: 'LTOP_'+place+'_kmeans_stratified_random_cluster_points_new_workflow_mapped', 
            assetId:assets_child+'/LTOP_'+place+'_kmeans_stratified_random_cluster_points_new_workflow_mapped'
}); 
//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LandTrendr Optimization workflow                           #\\
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
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
// 2. cluster the snic patches with kmeans - added a filter to remove points that didn't get valid values in previous step
var kmeans_output02_1 = ltop.kmeans02_1(ee.FeatureCollection(params.assetsRoot+params.assetsChild+"/LTOP_SNIC_pts_"+params.place+"_c2_"+params.randomPts.toString()+"_pts_"+params.startYear.toString()).filter(ee.Filter.neq('B1_mean',null)),
                                ee.Image(params.assetsRoot+params.assetsChild+"/LTOP_SNIC_imagery_"+params.place+"_c2_"+params.randomPts.toString()+"_pts_"+params.startYear.toString()),
                                params.aoi,
                                params.minClusters,
                                params.maxClusters); 
 
//export the kmeans output image to an asset
Export.image.toAsset({
            image: kmeans_output02_1,//kmeans_output02.get(0), 
            description:"LTOP_KMEANS_cluster_image_"+params.randomPts.toString()+"_pts_"+params.maxClusters.toString()+"_max_"+params.minClusters.toString()+"_min_clusters_"+params.place+"_c2_"+params.startYear.toString(), 
            assetId:params.assetsChild+"/LTOP_KMEANS_cluster_image_"+params.randomPts.toString()+"_pts_"+params.maxClusters.toString()+"_max_"+params.minClusters.toString()+"_min_clusters_"+params.place+"_c2_"+params.startYear.toString(),             
            region:params.aoi, 
            scale:30,
            maxPixels:1e13, 
}); 
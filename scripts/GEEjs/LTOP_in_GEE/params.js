//######################################################################################################## 
//#                                                                                                    #\\
//#                                   LandTrendr Optimization Paramater File                           #\\
//#                                                                                                    #\\
//########################################################################################################

exports = {
    place:'servir_comps_revised',
    startYear:1990,
    endYear:2021,
    seedSpacing:10, 
    randomPts:20000,
    imageSource:'servir',
    assetsRoot:'users/ak_glaciers/',
    assetsChild:'LTOP_servir_troubleshooting',
    aoi:ee.FeatureCollection("projects/servir-mekong/hydrafloods/CountryBasinsBuffer").geometry(),
    maxClusters:1000,
    minClusters:1,
    
    //only needed for medoid composites
    startDate:'11-20',
    endDate:'03-10',
    masked:['cloud', 'shadow']
  
  }; 
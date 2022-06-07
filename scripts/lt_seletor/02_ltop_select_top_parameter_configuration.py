
import os
import pandas as pd
import numpy as np

df = pd.read_csv("/vol/v1/proj/LTOP_mekong/csvs/02_param_selection/selected_param_config_gee_implementation/LTOP_servir_basin_comps_kmeans_pts_selected_config_revised_new_weights_output_testing_2.csv")
outfile = '/vol/v1/proj/LTOP_mekong/csvs/02_param_selection/selected_param_config_gee_implementation/LTOP_cambodia_kmeans_pts_config_selected_for_GEE_upload_new_weights_gee_implementation.csv'

def ClusterPointCalc(dframe, clusterPoint_id):

    #print(clusterPoint_id)

    these = dframe[(dframe['cluster_id']==clusterPoint_id) & (dframe['selected']==101)] #commented out the second part

    firstOfthese = these.head(1)[['cluster_id','index','params','spikeThreshold','maxSegments','recoveryThreshold','pvalThreshold']]

    #print(firstOfthese)

    return firstOfthese        


if __name__ == '__main__':

    dfList = []
    count = 0 
    #this was changed 3/8/2022 so that it iterates through the kmeans cluster ids and not a chronological list BRP
    for i in sorted(df['cluster_id'].unique()):#list(range(220)):
        print('iteration is: ',i)
        count = count + 1

        if count == 1 :

            newDFpart = ClusterPointCalc(df,i)

        else:
        
            newDFpart2 = ClusterPointCalc(df,i)

            dfList.append(newDFpart2)

        count +=1
    result = newDFpart.append(dfList)


    result.to_csv(outfile, index=False)
    

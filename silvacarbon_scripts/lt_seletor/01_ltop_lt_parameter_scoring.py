"""
**************************************
*
*
*
*
***************************************
"""

import os                                                                                                            
import pandas as pd                                                                                                  
import numpy as np  
import glob
import json 
import ast
from sklearn.metrics import mean_squared_error
from math import sqrt
import math
import sys             
from multiprocessing import Pool




"""
**************************************
* arr_to_col
*
*
*
*
***************************************
"""
def arr_to_col(df):

	df[['vert90','vert91','vert92','vert93','vert94','vert95','vert96','vert97','vert98','vert99','vert00','vert01','vert02','vert03','vert04','vert05','vert06','vert07','vert08','vert09','vert10','vert11','vert12','vert13','vert14','vert15','vert16','vert17','vert18','vert19','vert20']]=pd.DataFrame(df.vert.tolist(), index= df.index)

	return 1 
"""
**************************************
*
*
*
*
***************************************
"""
def dfprep(df):
    
	# drops uneeded columns 
	df.drop(columns=['system:index'])
	
	#df.sort_values("cluster_id",ascending = True,na_position ='last') 

	# add uique number for each row
	#df['cid'] = df.index+1 

	# add LT parameter config column
	df['paramNum'] = 0

	# adds weight scoure columna
	#df['Wscores'] =0.0

	# adds vertice year columns
	df[['vert90','vert91','vert92','vert93','vert94','vert95','vert96','vert97','vert98','vert99','vert00','vert01','vert02','vert03','vert04','vert05','vert06','vert07','vert08','vert09','vert10','vert11','vert12','vert13','vert14','vert15','vert16','vert17','vert18','vert19','vert20']]=0

	# adds summed vectices columns
	#df[['sum90','sum91','sum92','sum93','sum94','sum95','sum96','sum97','sum98','sum99','sum00','sum01','sum02','sum03','sum04','sum05','sum06','sum07','sum08','sum09','sum10','sum11','sum12','sum13','sum14','sum15','sum16','sum17','sum18','sum19','sum20']]=0

	# adds a column for normalized rmse
	df['NRMSE'] = 0.0

	# adds weight scoure columna
	#df['Vscores'] =0.0

	# adds AIC scoure columna
	df['AIC'] =0.0

	# adds AICc columna
	df['AICc'] =0.0
	
	
	dfsorted = df.sort_values(by=['cluster_id','params'],ignore_index=True)
	dfsorted['index_cid'] = dfsorted.index+1 
	df = 0 
	listvalues = list(range(1,145))
	
	ser = listvalues * int(len(dfsorted)/len(listvalues))
	
	dfsorted['paramNum']= ser + listvalues[:len(dfsorted)-len(ser)]

	return dfsorted      


"""
**************************************
*
*
*
*
***************************************
"""
# wrap your csv importer in a function that can be mapped
def read_csv(filename):
    #'converts a filename to a pandas dataframe'
	dftmp = pd.read_csv(filename, converters={'fitted':eval, 'orig': eval, 'vert': eval, 'year': eval})
	dftmp2 = dfprep(dftmp)
	return dftmp2
"""
**************************************
*
*
*
*
***************************************
"""
def read_in_CSVs():

    # get a list of file names
    files = glob.glob('/vol/v1/proj/LTOP_mekong/csvs/02_param_selection/*.csv')
    file_list = [filename for filename in files if filename.split('.')[1]=='csv']
    print(file_list)

    # set up your pool
    with Pool(processes=5) as pool: # or whatever your hardware can support

        # have your pool map the file names to dataframes
        df_list = pool.map(read_csv, file_list)

        # reduce the list of dataframes to a single dataframe
        #combined_df = pd.concat(df_list, ignore_index=True)
        
    return df_list


"""
**************************************
*midpoint
*
*
*  
*
***************************************
"""

def midpoint(lis):
    if 99999 in lis:
        ind = lis.index(99999)
        m = (lis[ind-1]+lis[ind+1])/2
        lis[ind] = m
    else:
        return 0


"""
**************************************
*summed_across_vertices
*
*
*
*
***************************************
"""
def summed_across_vertices(df_numOfPoints):

        # unpack tuple
        dftmp = df_numOfPoints

        startYear = 1990
        endYear = 2020

        # makes a list  [1990,1991 ...,2019 , 2020] a template of all the years in the time series.
        goodYear = list(range(startYear,endYear+1))

        # empty List for temporary placment of a single points sumed vert array ?
        vertStrings = []

        # iterate over each element of the two above lists of lists
        #for vert, year in zip(dfVertlist, dfYearlist):
        for index, row in dftmp.iterrows():

                # extracts a single list for the list of list  
                objVert = row['vert'][0] #[int(i) for i in json.loads(vert)[0]]  # example output [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1]
                #print(objVert)
                objYear = row['year'][0]#[int(i) for i in json.loads(year)[0]] # example output [1990, 1991, 1992, 1993, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2$

                objFit = row['fitted'][0]#[int(i) for i in json.loads(year)[0]] # example output [1990, 1991, 1992, 1993, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2$

                objOrig = row['orig'][0]#[int(i) for i in json.loads(year)[0]] # example output [1990, 1991, 1992, 1993, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2$

                # finds the missing year if there is one in the above  Year list 
                yearCheck = [ele for ele in range(1990, endYear+1) if ele not in objYear]


                # # check for missing elements in lists and add 0 if element is missing
                for place in yearCheck:

                        mis = goodYear.index(place)
                        objVert.insert(mis,0)
                        objYear.insert(mis,place)
                        objFit.insert(mis, 99999)
                        objOrig.insert(mis, 99999)

                # add value to miss fitted and orig midpoint calc
                midpoint(objFit)		
                midpoint(objOrig)
		
                #vertStrings.append(objVert)
                dftmp.at[index, 'vert'] = objVert
                dftmp.at[index, 'year'] = objYear
                dftmp.at[index, 'fitted'] = objFit
                dftmp.at[index, 'orig'] = objOrig

        return dftmp


"""
**************************************
*
*
*
*
***************************************
"""
def pool_summed_vert(df_list_cluster_id):

	# set up pool
	with Pool(processes=8) as pool: # or whatever your hardware can support
		# have your pool map the file names to dataframes
		df_list = pool.map(summed_across_vertices, df_list_cluster_id)

		combined_df = pd.concat(df_list, ignore_index=True)

	return combined_df
     

"""
**************************************
*
*
*
*
***************************************
"""

def get_max_rmse(df, index):
    # select it out of the DF
    ind = df[df['index']==index]  # just grab the rows for this index
    # RMSE is actually a string with brackets '[75.3434343]'  
    # So we have to extract it, float it, and then list it before we can max it. 
    
    max_rmse = np.max(ind['rmse'])   # we have to parse out the RMSE because it's a stri
    print(max_rmse)
    return {'index': index, 'RMSE_max': max_rmse*1.001}



"""
**************************************
*
*
*
*
***************************************
"""

def ClusterPointCalc(dframe, clusterPoint_id):

    print(clusterPoint_id)

    these = dframe[dframe['cluster_id']==clusterPoint_id]

    these['rankVscore'] = these['vertscore'].rank(method='max')

    these['rankAICc'] = these['AICc'].rank(method='max', ascending=False)

    these['combined'] = (these['rankAICc']/1.5)+these['rankVscore']

    these['selected'] = ((these['combined'] == np.max(these['combined']))*100)+1

    return these

"""
**************************************
*
*
*
*
***************************************
"""

def addValuesToNewColumns(index, row, df):

    count = 0

    replace1 = row['params'].replace('=',':')

    if "spikeThreshold:0.75," in replace1:
        df.at[index,'spikeThreshold'] =0.75
        print(1)
        count+=1
    if "spikeThreshold:0.9," in replace1:
        df.at[index,'spikeThreshold'] =0.9
        print(2)
        count+=1
    if "spikeThreshold:1," in replace1:
        df.at[index,'spikeThreshold'] =1.0
        print(3)
        count+=1

    if "maxSegments:6," in replace1:
        df.at[index, 'maxSegments'] = 6
        print(4)
        count+=1
    if "maxSegments:8," in replace1:
        df.at[index, 'maxSegments'] = 8
        print(5)
        count+=1
    if "maxSegments:10," in replace1:
        df.at[index,'maxSegments'] = 10
        print(6)
        count+=1
    if "maxSegments:11," in replace1:
        df.at[index, 'maxSegments'] = 11
        print(7)
        count+=1

    if "recoveryThreshold:0.25," in replace1:
        df.at[index, 'recoveryThreshold'] =0.25
        print(8)
        count+=1
    if "recoveryThreshold:0.5," in replace1:
        df.at[index, 'recoveryThreshold'] =0.5
        print(9)
        count+=1
    if "recoveryThreshold:0.9," in replace1:
        df.at[index, 'recoveryThreshold'] =0.9
        print(10)
        count+=1
    if "recoveryThreshold:1," in replace1:
        df.at[index, 'recoveryThreshold'] =1.0
        print(11)
        count+=1

    if "pvalThreshold:0.05," in replace1:
        df.at[index, 'pvalThreshold'] =0.05
        print(12)
        count+=1
    if "pvalThreshold:0.1," in replace1:
        df.at[index, 'pvalThreshold'] =0.1
        print(13)
        count+=1
    if "pvalThreshold:0.15," in replace1:
        df.at[index,'pvalThreshold'] =0.15
        print(14)
        count+=1

    if count != 4:
        print('broke')
        sys.exit() 
    return str(index)+"========="

#__________________________________________

#######################################################################################################################################################
#######################################################################################################################################################
#######################################################################################################################################################
#######################################################################################################################################################
               

### NEXT ###

"""
**************************************
*main
*
*
*
*
***************************************
"""

def main():

    print(1)
    # read in csv files                                                                                  
    df_lis = read_in_CSVs()

    print(2)
    # corrects breakpoint and year arrays by fill missing elements with a correct value. 
    df = pool_summed_vert(df_lis)

    print(3)
    # change the breakpoint array to columns in dataframe
    arr_to_col(df)

    print(4)

    #find the unique indices
    indices = set(df['index'])

    #populate a dictionary with the indices as keys and the max rmse
    # as the value
    max_rmse_dict = {}

    for ind in indices: 
	
        max_rmse_dict[ind] = get_max_rmse(df,ind)['RMSE_max']

    # go through the full dataframe and make a list with the
    # max rmse attached to each item. 
    
    df_indices = df['index']  # get the full list of indices
    max_rmse_list = [max_rmse_dict[ind] for ind in df_indices]  #make a list of the RMSE max based on that. 

    # now add that list to the data frame
    df['max_rmse']=max_rmse_list

    # fix the RMSE string to numeric type
    df['rmse_num']= df['rmse']

    # Then re-scale the RMSE 
    df['NRMSE']= df['rmse_num']/df['max_rmse']  # does this work? 

    # show it. 
    #df[['NRMSE', 'RMSE', 'rmse_num', 'max_rmse']] #, 'rmse_num', 'max_rmse']




    # score vertex matches.  THIS IS THE MAIN EVENT! 

    #First, extract the vertices as a numpy array to work with
    column_names = df.columns
    vs = [name for name in column_names if ('vert' in name) and (name != 'vert')]
    verts_only = df[vs].values #convert to a numpy array

    #**************************************************
    # Now, rescale all of the vertices by segment count
    # sum across the vertices to get the segment count. 
    segment_count = verts_only.sum(axis=1)-1   # segments = number of vertices minus 1
    df['n_segs']=segment_count

    print(df.iloc[498]['n_segs'])

    # reshape so there is a ,1 in the shape -- not sure why
    #. but the numpy division needs that.  a
    r=np.reshape(segment_count, (segment_count.shape[0], 1))
    #example:  r.shape = (86400,1) while segment_count.shape=(86400,)

    #rescale all of the vertices by the segment count
    # do this simply by multiplying the matrix by the 
    scaled_count = verts_only #/r    # all vertices are rescaled now

    #Now zero-out the end points, and then
    #set only the ones that have single segments to a non-zero
    # value.  set that value to the max it could be for 
    # two segments -- 0.5 

    scaled_count[:,0]=0
    scaled_count[:,-1]=(segment_count==1)#*(0.5)-------------in loop  
#**************************************************


#**************************************************
    # Now loop through points and get scores
    # for a given point, process things

    # first grab the chunks of the DF we will use, 
    #. and also get the unique values to loop over

    ind = df['index']# ------- in loop

    unique_inds = set(ind)# -------- in loop

    point = df['cluster_id']# -------- in loop

    unique_points = set(point)#-------- in loop

    # set up a blank array to hold our accumulating values
    vertscore = point * 0.0  # set up a blank ndarray

    print(5)

    prop_ind_to_all = 0.5   # set to even weighting. --------- in loop hard code

    print(len(unique_points))

    for this_point in unique_points: # len(unique_points) -> 5000
    
        print("6_loop")

        #get the total for this point across all indices
        point_matrix = scaled_count[(point==this_point),:]
        sums_by_point_vector= point_matrix.sum(axis=0)
    
        n_runs = point_matrix.shape[0]  #in theory this should always be the same, so could move this out of the loop
        scaled_sums_by_point_vector = sums_by_point_vector / n_runs
    
    
        #Do the same, but by index, and get the score
        #POINT, SINGLE INDEX
    
        for this_ind in unique_inds:
            print(f'Doing {str(this_point)} and {this_ind}')
            #do the same for this index
            point_ind_matrix = scaled_count[(ind==this_ind)&(point==this_point),:]
            sums_by_point_ind_vector= point_ind_matrix.sum(axis=0)
        
            #v2 -- scale by possilbe number of times it could be picked
            n_runs_ind = point_ind_matrix.shape[0]
            scaled_sums_by_point_ind_vector = sums_by_point_ind_vector / n_runs_ind

            score_matrix = ((point_ind_matrix * scaled_sums_by_point_ind_vector * prop_ind_to_all)+(point_ind_matrix * scaled_sums_by_point_vector * (1-prop_ind_to_all)))*100

            this_vertscore = score_matrix.sum(axis=1)

            #and then assign to the vertscore array that we'll put on the end
            vertscore[(ind==this_ind) & (point==this_point)]=this_vertscore

    df['vertscore']=vertscore




# **********
# with the segment counts we can also get the AIC

    goodness= 1-df['NRMSE']  # so a lower NRMSE is better goodness and light
    n_years = len(vs)  #vs was acquired above as the number of vertices

    df['AIC'] = (2*df['n_segs']) -(2*np.log(abs(goodness)))

    df['AICc'] = df['AIC'] + (2*df['n_segs']**2)/(n_years-df['n_segs']-1)


    dfList = []

    for i in list(range(5000)):

        i = i + 1

        if i == 1 :

            newDFpart = ClusterPointCalc(df,i)

        else:
    
            newDFpart2 = ClusterPointCalc(df,i)

            dfList.append(newDFpart2)


    result = newDFpart.append(dfList)

    df = result

    for index, row in df.iterrows():
 
        addValuesToNewColumns(index, row,df)
        

    outfile = '/vol/v1/proj/LTOP_mekong/csvs/02_param_selection/selected_param_config/LTOP_Laos_selected_config.csv'

    df.to_csv(outfile, index=False)


#######################################################################################################################################################
#######################################################################################################################################################
#######################################################################################################################################################
#######################################################################################################################################################
if __name__ == '__main__':
    main()

print('complete')
sys.exit()

#######################################################################################################################################################
#######################################################################################################################################################
#######################################################################################################################################################
#######################################################################################################################################################



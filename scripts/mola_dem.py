# Jason Angell
# SETI Institute / NASA Ames Research Center
# 25 April 2018

# Script to read in MOLA digital elevation model data at 128px/deg and export to a more useable / manageable format
# Reads in downloaded data from http://pds-geosciences.wustl.edu/missions/mgs/megdr.html
# Exports [format tbd] elevation data

import struct, os, pdb, random, csv, sys
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import axes3d
import scipy.interpolate

dpath = '/Users/Jason/Documents/mysite/mysite/scripts/mola_src'

# returns the name of the .img file
# this doesn't do type or value checking, but probably should
# reference: http://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/aareadme.txt
# lat: upper left latitute (positive / negative is translated to n/s)
# lon: upper left east longitude
# res: resolution in pix/deg
# type: topo by default
# ver: version, b by default
def getImgPath(lat, lon, res, typ='t', ver='b'):
	try:
		prepath = os.path.join(dpath, '{}dpp'.format(res))
		ns = 'n'
		if(lat < 0):
			ns = 's'
		fname = 'megt{}{}{}{}{}{}.img'.format(lat, ns, lon, res, typ, ver)
		return os.path.join(prepath, fname)
	except Exception as e:
		print 'failed to generate path based on the following exception:'
		print e

# returns the name of the .img file
# reference: http://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/aareadme.txt
# lat: upper left latitute (positive / negative is translated to n/s)
# lon: upper left east longitude
# res: resolution in pix/deg
# type: topo by default
# ver: version, b by default
def getLblPath(lat, lon, res, type='t', ver='b'):
	try:
		prepath = os.path.join(dpath, '{}dpp'.format(res))
		ns = 'n'
		if(lat < 0):
			ns = 's'
		fname = 'megt{}{}{}{}{}{}.lbl'.format(lat, ns, lon, res, typ, ver)
		return os.path.join(prepath, fname)
	except Exception as e:
		print 'failed to generate path based on the following exception:'
		print e

# reads a .lbl file and returns the data as a dictionary
# fpath: path to the .lbl file
def readLabelData(fpath):
	try:
		to_ret = {}
		with open(fpath, 'r') as f:
			#for line in f.
			lines = f.readlines()
			line_ind = 0
			cur_pair = None
			while line_ind < len(lines):
				line = lines[line_ind]
				if '=' in line:
					# this is a new pair, so add the last pair to the master dict
					if cur_pair:
						to_ret[cur_pair[0]] = cur_pair[1]
					# then get the next one
					parts = line.split('=')
					cur_pair = [parts[0].strip(), parts[1].strip()]
				else:
					# this is not a new pair, just a continuation of the value of the old one (like description or something), so append it
					cur_pair[1] += ' '+line.strip()
				line_ind += 1
			# add the last pair to the master dict
			to_ret[cur_pair[0]] = cur_pair[1]
		return to_ret
	
	except Exception as e:
		print 'Failed to read label data from {}. Exception:'.format(fpath)
		print e
		return None
# convert int into binary file
def i2b(n):
	x = struct.pack('>h', n)
	return x
# valid res: [4, 16, 32, 64, 128]
# valid for res 4, 16, 32: no lat lon (lat=90 lon=0 only)
# valid for res 64: lat in [90, 0], lon in [0, 180]
# valid for res 128: lat in [88, 44, 0, -44], lon in [0, 90, 180, 270]
class DEM:
	valid_res = [4, 16, 32, 64, 128]
	valid_lat = {4:[90], 16:[90], 32:[90], 64:[90,0], 128:[88,44,0,-44]}
	valid_lon = {4:[0], 16:[0], 32:[0], 64:[0,180], 128:[0,90,180,270]}
	res_letters = {4:'c', 16:'e', 32:'f', 64:'g', 128:'h'}

	dpath = '/Users/Jason/Documents/mysite/mysite/scripts/mola_src'

	outpath = '/Users/Jason/Documents/mysite/mysite/scripts/mola_out'

	def __init__(self, res, lat=90, lon=0):
		# validate res, lat, and lon
		if res not in DEM.valid_res:
			print 'Could not instantiate DEM. Res must be in {}, res was {}'.format(DEM.valid_res, res)
			return None
		if lat not in DEM.valid_lat[res]:
			print 'Could not instantiate DEM. Lat for res {} must be in {}, lat was {}'.format(res, DEM.valid_lat[res], lat)
			return None
		if lon not in DEM.valid_lon[res]:
			print 'Could not instantiate DEM. Lon for res {} must be in {}, lon was {}'.format(res, DEM.valid_lon[res], lon)
			return None

		# set resolution, lat, and lon
		self.res = res
		self.lat = lat
		self.lon = lon

		ns = 'n'
		if(lat < 0):
			ns = 's'
		res_let = DEM.res_letters[res]

		# file specifier, independent of extension
		self.fspec = 'megt{:02d}{}{:03d}{}b'.format(lat, ns, lon, res_let)
		self.lbl_path = os.path.join(DEM.dpath, '{}dpp'.format(res), '{}.lbl'.format(self.fspec))
		self.img_path = os.path.join(DEM.dpath, '{}dpp'.format(res), '{}.img'.format(self.fspec))

		# read in label data on init (save reading in img data for self.readData() call)
		lbl_data = readLabelData(self.lbl_path)
		self.n_lines = int(lbl_data['LINES'])
		self.n_line_samples = int(lbl_data['LINE_SAMPLES'])
		self.offset = None
		self.scaling_factor = None
		if 'OFFSET' in lbl_data:
			self.offset = float(lbl_data['OFFSET'])
		if 'SCALING_FACTOR' in lbl_data:
			self.scaling_factor = float(lbl_data['SCALING_FACTOR'])

		self.data = None
			
	# converts 2 bytes (16 bits) of binary to integer
	def b2i(self, b):
		x = struct.unpack('>h', b)[0]
		#if self.scaling_factor:
		#	x *= self.scaling_factor
		#if self.offset:
		#	x += self.offset
		#x = int(x) # cast to int just in case of a non-integer offset or scaling factor
		return x

	def hasDataBeenRead(self):
		return self.data != None

	# returns a len-2 array with [minimum latitude, maximum latitude]
	def getLatRange(self):
		maxLat = self.lat
		if self.res in [4, 16, 32]:
			minLat = -90
		# 64 res has latitude in 90 degree chunks (0 to 90 or -90 to 0)
		elif self.res == 64:
			minLat = self.lat - 90
		# 128 res has latitude in 44 degree chunks between -88 and 88
		else:
			minLat = self.lat - 44
		return [minLat, maxLat]

	# returns a len-2 array with [minimum longitude, maximum longitude]
	def getLonRange(self):
		minLon = self.lon
		if self.res in [4, 16, 32]:
			maxLon = 360
		# 64 res has longitude in 180 degree chunks
		elif self.res == 64:
			maxLon = self.lon + 180
		# 128 res has longitude in 90 degree chunks
		else:
			maxLon = self.lon + 90
		return [minLon, maxLon]

	# reads in the data from img file
	def readData(self, verbose=True):
		try:
			lines = []
			with open(self.img_path, 'r') as f:
				for i in range(self.n_lines):
					cur_line = []
					for j in range(self.n_line_samples):
						cur_line.append(self.b2i(f.read(2)))
					lines.append(cur_line)
					# if verbose, print percent complete (keep same line w/ flush & carriage return)
					if verbose:
						print '\r{:2.2f}%'.format(100.*i/self.n_lines),
						sys.stdout.flush()
			self.data = lines
			if verbose:
				print	# get out of carriage return one-line thing
			return True
		except Exception as e:
			print "Failed to read in MOLA DEM data file. Exception:"
			print e
			return False

	# returns the data as a numpy array object
	def getDataAsNPArray(self, latRange=None, lonRange=None):
		if self.hasDataBeenRead():
			to_data = self.data
			# if latRange is defined, calculate the line indices that correspond to it
			if latRange:
				hiLat = max(latRange)	# 90
				loLat = min(latRange)	# 88
				maxLat = max(self.getLatRange())
				minLat = min(self.getLatRange())
				latDiff = maxLat - minLat
				# percentage of (maxLat - minLat) that hiLat is at
				start_ratio = float(maxLat - hiLat)/latDiff
				# percentage of minLat that loLat is at
				end_ratio = float(maxLat - loLat)/latDiff
				start_line = int(start_ratio * self.n_lines)
				end_line = int(end_ratio * self.n_lines)
				to_data = to_data[start_line:end_line]
			if lonRange:
				hiLon = max(lonRange)
				loLon = min(lonRange)
				maxLon = max(self.getLonRange())
				minLon = min(self.getLonRange())
				lonDiff = maxLon - minLon
				start_ratio = float(maxLon - hiLon)/lonDiff
				end_ratio = float(maxLon - loLon)/lonDiff
				start_sample = int(start_ratio * self.n_line_samples)
				end_sample = int(end_ratio * self.n_line_samples)
				# go line by line through the data and cut it down to size
				for i in range(len(to_data)):
					to_data[i] = to_data[i][start_sample:end_sample]
			return np.array(to_data)
		return None

	# write to CSV file without any metadata, using filename to specify any metadata we need
	# written files go by default into the mola_out directory
	# 'default_placeholder_string' is only there because I can't use self.fspec in the definition, so it gets filled in on the first line of the function
	def writeToCSV(self, fname='default_placeholder_string'):
		if fname == 'default_placeholder_string':
			fname = '{}_out.csv'.format(self.fspec)
		fpath = os.path.join(DEM.outpath, fname)
		if not self.hasDataBeenRead():
			print 'Data not yet read. writeToCSV() failed.'
			return False

		with open(fpath, 'w') as f:
			csv_writer = csv.writer(f)
			for line in self.data:
				csv_writer.writerow(line)
		return True


if __name__ == '__main__':
	# stitch together res 128 data and export in 10x10 tiles
	fout = os.path.join(DEM.outpath, 'fullres_fullscale.dat')
	dems = []
	lats = [88, 44, 0, -44]
	lons = [0, 90, 180, 270]

	# write 90 to 88 to a file


	# output line by line from 90deg to -90deg
	# 90 to 88: interpolate in 64res data
	# 88 to -88: use 128res data
	# -88 to -90: interpolate from 64res again

	# read in 64s
	# variable format: dem_<res>_<startLat>_<startLon>
	
	print 'running MOLA DEM script'
	dem64 = {}
	dem64['90_0'] = DEM(64, 90, 0)
	dem64['90_180'] = DEM(64, 90, 180)
	#dem64['0_0'] = DEM(64, 0, 0)
	#dem64['0_180'] = DEM(64, 0, 180)
	#pdb.set_trace()
	
	#print 'created all 64res objects. reading in data...'
	#for d in dem64:
	#	dem64[d].readData()
	#	print 'finished reading {}'.format(d.fspec)
	
	# size check is just for fun
	#total_size = 0
	#for d in dem64:
	#	total_size += sys.getsizeof(d)
	#print 'all 64res objects read in. total size: {}'.format(total_size)
	
	dem = DEM(4)
	x = np.linspace(0, 360, dem.n_line_samples)
	y = np.linspace(90, -90, dem.n_lines)
	print 'reading in 32res file'
	dem.readData()
	print 'linear interpolating'
	pdb.set_trace()
	f = scipy.interpolate.interp2d(x, y, dem.data)
	full_x = np.linspace(0, 360, dem.n_line_samples * 32)
	full_y = np.linspace(0, 360, dem.n_lines * 32)
	mg = np.meshgrid(full_x, full_y)
	print 'generating full data'
	full_data = f(mg)
	pdb.set_trace()
	# now let's interpolate (this is what we have vs what we want)
	'''
	* + * + *		* * * * *
	+ + + + +		* * * * *
	* + * + *  -> 	* * * * *
	+ + + + +		* * * * *
	* + * + *		* * * * *
	'''

	'''
	fpath  = os.path.join(DEM.outpath, '{}_out.img'.format(dem.fspec))
	with open(fpath, 'w') as f:
		for line in dem.data:
			for l in line:
				f.write(i2b(l))
	'''

# print a 3d version of the figure
def print3d():
	dem = DEM(16)
	dem.readData()
	latRange = [16,30]
	lonRange = [208, 220]
	dat = dem.getDataAsNPArray(latRange=latRange, lonRange=lonRange)
	grid = np.meshgrid(np.linspace(lonRange[1], lonRange[0], len(dat[0])), np.linspace(latRange[1], latRange[0], len(dat)))

	fig = plt.figure()
	ax = fig.add_subplot(211, projection='3d')
	ax.contourf(grid[0], grid[1], dat)
	ax = fig.add_subplot(212, projection='3d')
	ax.plot_wireframe(grid[0], grid[1], dat, cstride=5, rstride=5)

	plt.show()

def makeSlicedImage():
	#ax = [plt.subplot(5,1,i+1) for i in range(5)]
	plt.subplot(511)
	plt.imshow(dem.getDataAsNPArray(latRange=[90,54]), cmap='terrain')
	plt.axis('off')
	plt.subplot(512)
	plt.imshow(dem.getDataAsNPArray(latRange=[54,18]), cmap='Pastel1')
	plt.axis('off')
	plt.subplot(513)
	plt.imshow(dem.getDataAsNPArray(latRange=[18,-18]), cmap='Blues')
	plt.axis('off')
	plt.subplot(514)
	plt.imshow(dem.getDataAsNPArray(latRange=[-54,-18]), cmap='nipy_spectral')
	plt.axis('off')
	plt.subplot(515)
	plt.imshow(dem.getDataAsNPArray(latRange=[-90,-54]), cmap='ocean')
	plt.axis('off')
	plt.show()

def latCrossSections():

	dem = DEM(16)
	dem.readData()

	lats = []
	latlines = []
	for i in range(5):
		lat = random.random()*180 - 90
		lats.append(lat)
		

	lats.sort()
	lats.reverse()

	for lat in lats:
		latline = int((lat + 90)/180 * dem.n_lines)
		latlines.append(latline)

	fig = plt.figure(figsize = (50, 10))
	plt.subplot(1,2,1)
	plt.imshow(dem.getDataAsNPArray(), cmap='terrain')
	plt.title('MOLA (Mars Altitude)')
	for ll in latlines:
		plt.plot([0, dem.n_line_samples], [ll,ll], 'r', alpha=.5)
	for i in range(len(lats)):
		lat = lats[i]
		ax = plt.subplot(len(lats), 2, 2*(i+1))
		plt.title('Altitude cross-section at {}$\degree$'.format(lat))
		ax.set_xticklabels([])
		plt.plot(range(dem.n_line_samples), dem.data[latlines[i]], 'r')
	plt.savefig('alt_cross.png')


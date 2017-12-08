# Jason Angell
# SETI Institute / NASA Ames Research Center
# takes a file as an argument and then converts that file to a CSV file with filename={second argument} in a good format for raman plotting (wavenumber,intensity)
# usage: python process_rruff.py rruff_input.txt csv_output.csv

import csv, sys


# reads in an rruff-formatted file and returns a length-2 list, where the first item is the list of wavenumbers and the second is the corresponding list of intensities
def read_in(filename):
	# 'firsts' and 'seconds' are named as such because we're not sure yet which is wavenumbers and which is intensities
	firsts = []
	seconds = []
	data = []
	with open(filename,'r') as f:
		for line in f:
			try:
				vals = line.split(',')
				firsts.append(float(vals[0]))
				seconds.append(float(vals[1]))
			except Exception as e:
				continue
	# check a couple of common concerns - same number of points in each list, and that they're not length-0
	if len(firsts) != len(seconds):
		print 'Length of points lists is not consistent. Quitting.'
		return False
	if len(firsts) == 0:
		print 'No points found. Quitting'
		return False

	# order lists [wavs,counts]
	# assume that all of the gaps in the wavenumbers are within about 10% ([1, 2.05, 3.02, ...])
	# check by looking at the size of two adjacent gaps
	tolerance = .05
	width = 10
	# check which of the lists has consistent gaps (use numbers in the middle of the spectrum because the ends might be wonky)
	order_known = False
	cur = len(firsts)/2 # this is cur for firsts and seconds, because they should be the same length (we already checked)
	while not order_known:
		firsts_gap_1 = abs(firsts[cur+1] - firsts[cur])
		firsts_gap_2 = abs(firsts[cur+2] - firsts[cur+1])
		firsts_diff = firsts_gap_2 - firsts_gap_1
		firsts_diff_perc = firsts_diff / firsts_gap_1

		seconds_gap_1 = abs(seconds[cur+1] - seconds[cur])
		seconds_gap_2 = abs(seconds[cur+2] - seconds[cur+1])
		seconds_diff = seconds_gap_2 - seconds_gap_1
		seconds_diff_perc = seconds_diff / seconds_gap_1

		# if one gap is consistent and the other isn't, then we know the order, and can order them [wavs,counts] into data. otherwise, bump up cur by one, and keep going
		if firsts_diff_perc < tolerance and seconds_diff_perc > tolerance:
			# firsts is consistent, seconds isn't - firsts is wavelengths
			data = [firsts,seconds]
			order_known = True
		elif seconds_diff_perc < tolerance and firsts_diff_perc > tolerance:
			# vice versa
			data = [seconds,firsts]
			order_known = True
		else:
			cur += 1

	# make sure points are in ascending order
	wavs = data[0]
	if wavs[1] < wavs[0]:
		# reverse both (parallel lists)
		data[0] = data[0][::-1]
		data[1] = data[1][::-1]

	return data

# takes the filename to write the data to and the data. writes the file.
def write_out(filename, data):
	with open(filename,'w') as csvfile:
		writer = csv.writer(csvfile,delimiter=',')
		for row in range(len(data[0])):
			writer.writerow([data[0][row],data[1][row]])


if __name__ == "__main__":
	try:
		input_file = sys.argv[1]
		output_file = sys.argv[2]
	except Exception as e:
		print e
		print "Aborting process - sorry bout it!"
	data = read_in(input_file)
	write_out(output_file, data)
	print 'data len: {}. data[0] len: {}'.format(len(data),len(data[0]))
	# read in file
	# output to csv


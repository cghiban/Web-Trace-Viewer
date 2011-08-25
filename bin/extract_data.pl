#!/usr/bin/perl 
#===============================================================================
#
#         FILE:  extract_data.pl
#
#        USAGE:  ./extract_data.pl file > output.json
#
#  DESCRIPTION:  Extracts and dumps some data from a AB1/ABI trace file into json format
#
# REQUIREMENTS:  Bio::Trace::ABIF, JSON::Any, List::Utils=max
#
#      AUTHORS:  Cornel Ghiban <ghiban@cshl.edu>; Mohammed Khalfan <mkhalfan@cshl.edu>
#      COMPANY:  DNALC, Cold Spring Harbor Laboratory
#         DEMO:  http://dnasubway.iplantcollaborative.org/ (blue line)
#===============================================================================

# The contents of this file are subject to the terms listed in the LICENSE file
# you received with this code.

use strict;
use warnings;

use Bio::Trace::ABIF ();
use JSON::Any;
use List::Util qw/max/;

my $file = shift;

usage("\n\tFile not specified or not found!\n") unless ($file && -e $file);

# open file and check if it;s in the right format
my $ab = Bio::Trace::ABIF->new;
unless ($ab->open_abif($file) || $ab->is_abif_format) {
	usage("\n\tCan't open file or file is not a AB1/ABI file.\n");
}

$file =~ s|.*/||;
my $data = {
		d => $file, # display_id
		s => '', # sequence
		q => [], # quality scores
		l => [], # base locations
		A => [],
		T => [],
		C => [],
		G => [],
	};

# extract:	sequence
$data->{s} = $ab->sequence;


# extract:	traces + normalization
my $max = 0;
for (qw(A G T C)) {
	my @t = $ab->trace($_);
	$data->{$_} = \@t;
	my $local_max = max(@t);
	$max = $local_max > $max ? $local_max : $max;
}

#normalize trace values
for (qw(A G T C)) {
	$data->{$_} = [ map { int(sprintf("%d", 100 * $_/$max)) } @{$data->{$_}}];
}

# extract:	base locations
$data->{l} = [ $ab->base_locations ];

# extract:	quality scores
$data->{q} = [ $ab->quality_values ];

# close ab file
$ab->close_abif;

# dump data
my $j = JSON::Any->new;
print $j->encode($data);

sub usage {
	my $msg = shift || "\n";
	print STDERR $msg;
	die "\tUsage: $0 file > data.txt\n\n";
}


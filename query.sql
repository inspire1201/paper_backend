
select surname_caste,assembly_no,s.assembly_name,
sum(count_num) as total

from tbl_all_surname
Inner join assembly_vandan s on assembly_no= s.assembly_id
where surname_caste = 'गोंड'
group by surname_caste,assembly_no;

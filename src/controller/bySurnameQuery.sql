 select surname_similar ,
 sum(count_num)
 from tbl_all_surname 
 group by surname_similar;
 
 
 
 select s.assembly_name , s.assembly_id ,surname_similar,
 sum(count_num) as total 
 from tbl_all_surname
Inner join assembly_paper s on assembly_no = s.assembly_id
 where surname_similar = 'साहू'
 group by surname_similar,s.assembly_name , s.assembly_id;
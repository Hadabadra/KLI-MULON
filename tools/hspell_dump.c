#include <stdio.h>
#include <string.h>
#include "linginfo.h"
int main(){ char line[256], *desc,*stem, buf[512];
 linginfo_init("/usr/share/hspell/hebrew.wgz");
 while(fgets(line,sizeof line,stdin)){ line[strcspn(line,"\n")]=0;
  printf("%s",line);
  if(linginfo_lookup(line,&desc,&stem)){ for(int i=0;;i++){ if(!linginfo_desc2text(buf,desc,i)) break; char*st=linginfo_stem2text(stem,i); printf("\t%s=%s",st?st:"",buf);} }
  printf("\n"); } return 0; }

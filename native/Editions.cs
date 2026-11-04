using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Collections.Generic;
using System.Xml.Linq;
using System.Windows.Forms;
namespace OnePageBI {
 internal sealed partial class Workbench {
  static readonly XNamespace W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  static XElement Para(string text,string style=null){
   return new XElement(W+"p",style==null?null:new XElement(W+"pPr",new XElement(W+"pStyle",new XAttribute(W+"val",style))),new XElement(W+"r",new XElement(W+"t",text)));
  }
  static XElement Table(IEnumerable<string[]> rows){
   var table=new XElement(W+"tbl",new XElement(W+"tblPr",new XElement(W+"tblW",new XAttribute(W+"w","9000"),new XAttribute(W+"type","dxa"))),new XElement(W+"tblGrid",new XElement(W+"gridCol",new XAttribute(W+"w","5800")),new XElement(W+"gridCol",new XAttribute(W+"w","3200"))));
   int row=0;foreach(var fields in rows){var tr=new XElement(W+"tr");for(int i=0;i<fields.Length;i++)tr.Add(new XElement(W+"tc",new XElement(W+"tcPr",new XElement(W+"tcW",new XAttribute(W+"w",i==0?"5800":"3200"),new XAttribute(W+"type","dxa")),new XElement(W+"shd",new XAttribute(W+"fill",row%2==0?"EAF1ED":"FFFFFF"))),Para(fields[i],i==0?"Body":"Number")));table.Add(tr);row++;}return table;
  }
  static void Part(ZipArchive zip,string name,string xml){var e=zip.CreateEntry(name,CompressionLevel.Optimal);using(var w=new StreamWriter(e.Open(),new UTF8Encoding(false)))w.Write(xml);}
  static void WordFile(string path,Dictionary<string,object> brief,System.Web.Script.Serialization.JavaScriptSerializer json){
   var b=new XElement(W+"body",Para((string)brief["title"],"Title"),Para(String.Join("   ·   ",new[]{(string)brief["unit"],(string)brief["start"],(string)brief["end"]}.Where(v=>!String.IsNullOrEmpty(v)).Distinct()),"Body"));
   b.Add(Table(json.Deserialize<string[][]>(json.Serialize(brief["cards"]))));
   foreach(var plot in json.Deserialize<Dictionary<string,object>[]>(json.Serialize(brief["figures"]))){
    b.Add(Para((string)plot["title"],"Heading1"));
    var rows=json.Deserialize<object[][]>(json.Serialize(plot["items"]));if(rows.Length==0)b.Add(Para(Convert.ToString(plot["empty"]),"Body"));else b.Add(Table(rows.Select(r=>new[]{Convert.ToString(r[0]),Convert.ToDecimal(r[1]).ToString(Convert.ToBoolean(plot["count"])?"#,##0":"#,##0.00",System.Globalization.CultureInfo.InvariantCulture)})));
   }
   b.Add(new XElement(W+"sectPr",new XElement(W+"pgSz",new XAttribute(W+"w",11906),new XAttribute(W+"h",16838)),new XElement(W+"pgMar",new XAttribute(W+"top",850),new XAttribute(W+"bottom",850),new XAttribute(W+"left",1170),new XAttribute(W+"right",1170))));
   var styles=new XElement(W+"styles");foreach(var id in new[]{"Title","Heading1","Body","Number"}){
    bool head=id=="Title"||id=="Heading1";styles.Add(new XElement(W+"style",new XAttribute(W+"type","paragraph"),new XAttribute(W+"styleId",id),new XElement(W+"name",new XAttribute(W+"val",id=="Heading1"?"heading 1":id)),new XElement(W+"pPr",head?new XElement(W+"keepNext"):null,new XElement(W+"spacing",new XAttribute(W+"before",head?140:22),new XAttribute(W+"after",head?70:22)),id=="Number"?new XElement(W+"jc",new XAttribute(W+"val","right")):null),new XElement(W+"rPr",new XElement(W+"rFonts",new XAttribute(W+"ascii","Calibri"),new XAttribute(W+"eastAsia","Microsoft YaHei")),head?new XElement(W+"b"):null,new XElement(W+"sz",new XAttribute(W+"val",id=="Title"?42:id=="Heading1"?27:21)))));}
   using(var fs=new FileStream(path,FileMode.CreateNew))using(var zip=new ZipArchive(fs,ZipArchiveMode.Create)){
    Part(zip,"[Content_Types].xml","<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/><Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/></Types>");
    Part(zip,"_rels/.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>");
    Part(zip,"word/_rels/document.xml.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");
    Part(zip,"word/document.xml",new XElement(W+"document",new XAttribute(XNamespace.Xmlns+"w",W),b).ToString());Part(zip,"word/styles.xml",styles.ToString());
   }
  }
  // The mutable working copy lives outside the sealed generation directory.
  string EditionRoot(string id){store.ItemPath(id,"metadata.json");return Path.Combine(Path.GetDirectoryName(store.Reports),"Editions",id);}
  void PrepareEdition(string id,Dictionary<string,object>d){
   string root=EditionRoot(id),working=Path.Combine(root,"Working");if(Directory.Exists(working))return;
   Directory.CreateDirectory(root);string stage=Path.Combine(root,".building-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(stage);
   try{
    var files=store.Json.Deserialize<Dictionary<string,string>>((string)d["project"]);
    if(!files.ContainsKey("Workbench.pbip")||files.Count>128)throw new InvalidDataException();
    foreach(var f in files){if(!System.Text.RegularExpressions.Regex.IsMatch(f.Key,@"^(Workbench\.pbip|Workbench\.(Report|SemanticModel)/[A-Za-z0-9_./-]+)$")||f.Key.Contains(".."))throw new InvalidDataException();
    string target=Path.Combine(stage,f.Key);Directory.CreateDirectory(Path.GetDirectoryName(target));File.WriteAllText(target,f.Value,new UTF8Encoding(false));}
    WordFile(Path.Combine(stage,"Executive.docx"),store.Json.Deserialize<Dictionary<string,object>>((string)d["brief"]),store.Json);
    if(!Directory.Exists(working))Directory.Move(stage,working);
   }finally{if(Directory.Exists(stage))Directory.Delete(stage,true);}
  }
  static void Pack(ZipArchive zip,string dir,string prefix){
   foreach(var file in new DirectoryInfo(dir).EnumerateFileSystemInfos()){
    if((file.Attributes&FileAttributes.ReparsePoint)!=0||file.Name.StartsWith(".")||file.Name.StartsWith("~$"))continue;
    if((file.Attributes&FileAttributes.Directory)!=0){Pack(zip,file.FullName,prefix+file.Name+"/");continue;}
    using(var src=new FileStream(file.FullName,FileMode.Open,FileAccess.Read,FileShare.Read))using(var dst=zip.CreateEntry(prefix+file.Name,CompressionLevel.Optimal).Open())src.CopyTo(dst);
   }
  }
  string Revision(string id){string root=EditionRoot(id),dir=Path.Combine(root,"Revisions");Directory.CreateDirectory(dir);string target=Path.Combine(dir,DateTime.Now.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6)+".zip"),stage=target+".tmp";
   try{using(var f=new FileStream(stage,FileMode.CreateNew))using(var zip=new ZipArchive(f,ZipArchiveMode.Create))Pack(zip,Path.Combine(root,"Working"),"");File.Move(stage,target);return target;}finally{if(File.Exists(stage))File.Delete(stage);}
  }
  object Edition(string id,string action){string root=EditionRoot(id),working=Path.Combine(root,"Working");if(!Directory.Exists(working))throw new IOException();
   switch(action){case "export":
    using(var dlg=new SaveFileDialog{FileName="OnePageBI-editable.zip",Filter="ZIP (*.zip)|*.zip",DefaultExt="zip",AddExtension=true}){
     if(dlg.ShowDialog(this)!=DialogResult.OK)return false;string target=Path.GetFullPath(dlg.FileName);
     string basePath=Path.GetFullPath(Path.GetDirectoryName(store.Reports)).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
     if(!target.EndsWith(".zip",StringComparison.OrdinalIgnoreCase)||target.StartsWith(basePath,StringComparison.OrdinalIgnoreCase))throw new DesktopError("Save the copy outside the archive and editions folders.","请将副本保存到归档和编辑目录之外。");
     string staged=target+"."+Guid.NewGuid().ToString("N")+".tmp";try{using(var fs=new FileStream(staged,FileMode.CreateNew))using(var z=new ZipArchive(fs,ZipArchiveMode.Create))Pack(z,working,"");if(File.Exists(target))File.Replace(staged,target,null);else File.Move(staged,target);}finally{if(File.Exists(staged))File.Delete(staged);}
    }break;
   case "folder":Open(root);break;case "power":Open(Path.Combine(working,"Workbench.pbip"));break;case "word":Open(Path.Combine(working,"Executive.docx"));break;case "revision":return Path.GetFileName(Revision(id));default:throw new InvalidOperationException();}return true;
  }
 }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;

namespace OnePageBI {
  internal sealed class DesktopError : IOException {
    internal readonly string Chinese;
    internal DesktopError(string english,string chinese) : base(english){Chinese=chinese;}
  }
  internal sealed class Store {
    internal string Language="en";
    internal string Examples { get {return Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"examples",Language);} }
    internal void SetLanguage(string language){
      bool examples=String.Equals(Folder,Examples,StringComparison.OrdinalIgnoreCase);
      Language=language=="zh-CN"?"zh-CN":"en";
      if(examples)Folder=Examples;
    }
    internal readonly string Reports, Desktop;
    internal string Folder;
    internal byte[] Snapshot;
    internal string SourceName, Token, Hash;
    internal readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 64*1024*1024, RecursionLimit=128 };
    static readonly UTF8Encoding Utf8 = new UTF8Encoding(false);
    const int MaxInput = 5*1024*1024;
    internal Store(string profile) {
      Desktop = profile==null ? Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) : Path.Combine(profile,"Desktop");
      Reports = profile==null ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),"One Page BI","Reports") : Path.Combine(profile,"Reports");
      if(profile!=null) Directory.CreateDirectory(Desktop);
      Folder=Desktop;
    }
    static bool Allowed(FileInfo f) {
      return (f.Extension.Equals(".csv",StringComparison.OrdinalIgnoreCase) || f.Extension.Equals(".xlsx",StringComparison.OrdinalIgnoreCase))
        && !f.Name.StartsWith("~$") && (f.Attributes & (FileAttributes.Hidden|FileAttributes.System|FileAttributes.ReparsePoint))==0;
    }
    internal object Inventory() {
      return new {folder=Folder,isExamples=String.Equals(Folder,Examples,StringComparison.OrdinalIgnoreCase),files=new DirectoryInfo(Folder).EnumerateFiles().Where(Allowed)
        .OrderByDescending(f=>f.LastWriteTimeUtc).Select(f=>new {name=f.Name,size=f.Length,modified=f.LastWriteTimeUtc.ToString("o")}).ToArray()};
    }
    internal object Load(string name) {
      if(Path.GetFileName(name)!=name) throw new DesktopError("Invalid file name.","文件名无效。");
      var file=new FileInfo(Path.Combine(Folder,name));
      if(!file.Exists || !Allowed(file)) throw new DesktopError("File moved or unsupported. Refresh the inventory.","文件已移动或格式不受支持，请刷新。");
      byte[] input;
      using(var s=new FileStream(file.FullName,FileMode.Open,FileAccess.Read,FileShare.Read)){
        if(s.Length>MaxInput)throw new DesktopError("The file exceeds the 5 MiB limit.","文件超过 5 MiB 上限。");
        using(var m=new MemoryStream()){s.CopyTo(m);input=m.ToArray();}
      }
      if(file.Extension.Equals(".xlsx",StringComparison.OrdinalIgnoreCase)){
        using(var zip=new ZipArchive(new MemoryStream(input),ZipArchiveMode.Read)){
          if(zip.Entries.Count>2000 || zip.Entries.Sum(e=>e.Length)>32*1024*1024L || zip.GetEntry("xl/workbook.xml")==null)
            throw new DesktopError("Unsupported workbook or above the unpacked limit of 32 MiB or 2,000 entries.","不支持该工作簿结构，或解压后超过 32 MiB / 2,000 项。");
        }
      }
      Snapshot=input; SourceName=name; Token=Guid.NewGuid().ToString("N");
      using(var sha=SHA256.Create()) Hash=BitConverter.ToString(sha.ComputeHash(input)).Replace("-","").ToLowerInvariant();
      return new {name=name,token=Token,bytes=Convert.ToBase64String(input)};
    }
    internal string Archive(Dictionary<string,object> d) {
      if(Snapshot==null || (string)d["token"]!=Token) throw new DesktopError("The source changed. Reload it and check the mapping again.","数据快照已更换，请重新载入并确认字段。");
      Directory.CreateDirectory(Reports);
      string id=Guid.NewGuid().ToString("N"), stage=Path.Combine(Reports,".partial-"+id), dest=Path.Combine(Reports,id);
      Directory.CreateDirectory(stage);
      try{
        foreach(string sub in new[]{"inputs","data","dashboard","exports"}) Directory.CreateDirectory(Path.Combine(stage,sub));
        File.WriteAllBytes(Path.Combine(stage,"inputs",SourceName),Snapshot);
        File.WriteAllText(Path.Combine(stage,"data","processed.json"),(string)d["processed"],Utf8);
        File.WriteAllText(Path.Combine(stage,"dashboard","report.html"),(string)d["html"],Utf8);
        File.WriteAllText(Path.Combine(stage,"template.json"),(string)d["template"],Utf8);
        byte[] png=ReadPng((string)d["png"]);
        File.WriteAllBytes(Path.Combine(stage,"exports","report.png"),png);
        var meta=new {id=id,created=(string)d["created"],source=SourceName,sha256=Hash,rows=Convert.ToInt32(d["rows"]),sheet=(string)d["sheet"],appVersion="0.1.1",language=Language,schemaVersion=1};
        File.WriteAllText(Path.Combine(stage,"metadata.json"),Json.Serialize(meta),Utf8);
        Directory.Move(stage,dest);
      } finally {if(Directory.Exists(stage)) Directory.Delete(stage,true);}
      return id;
    }
    internal static byte[] ReadPng(string data){
      byte[] bytes=Convert.FromBase64String(data);
      if(bytes.Length<24 || bytes[0]!=137 || bytes[1]!=80 || bytes[2]!=78 || bytes[3]!=71)throw new DesktopError("PNG export did not finish.","PNG 导出未完成。");
      return bytes;
    }
    internal string ItemPath(string id,string file) {
      Guid valid;
      if(!Guid.TryParseExact(id,"N",out valid))throw new DesktopError("Invalid archive ID.","档案编号无效。");
      string root=Path.Combine(Reports,valid.ToString("N"));
      if(!File.Exists(Path.Combine(root,"metadata.json")))throw new DesktopError("Archive record not found.","找不到该次生成记录。");
      return Path.Combine(root,file);
    }
    internal object History(){
      var list=new List<Dictionary<string,object>>();int skipped=0;
      if(Directory.Exists(Reports)) foreach(string folder in Directory.EnumerateDirectories(Reports)){
        Guid id;
        if(!Guid.TryParseExact(Path.GetFileName(folder),"N",out id))continue;
        try{
          var meta=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(folder,"metadata.json")));
          if((string)meta["id"]!=id.ToString("N") || !meta.ContainsKey("source") || !meta.ContainsKey("created"))throw new InvalidDataException();
          list.Add(meta);
        }catch(Exception){skipped++;}
      }
      return new {items=list.OrderByDescending(m=>(string)m["created"]).ToArray(),skipped=skipped,folder=Reports};
    }
  }
}

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
    sealed class InputCopy {
      internal string Name, Token, Hash, Role;
      internal byte[] Bytes;
    }
    readonly Dictionary<string,InputCopy> snapshots=new Dictionary<string,InputCopy>();
    readonly Dictionary<string,InputCopy> pool=new Dictionary<string,InputCopy>();
    internal readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 64*1024*1024, RecursionLimit=128 };
    static readonly UTF8Encoding Utf8 = new UTF8Encoding(false);
    const int MaxInput = 5*1024*1024;
    internal Store(string profile) {
      Desktop = profile==null ? Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) : Path.Combine(profile,"Desktop");
      Reports = profile==null ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),"One Page BI","Reports") : Path.Combine(profile,"Reports");
      if(profile!=null) Directory.CreateDirectory(Desktop);
      Folder=Desktop;
    }
    internal const string ReportSuffix=".onepagebi.html";
    static bool IsReport(string name){
      return name.Length>ReportSuffix.Length && name.EndsWith(ReportSuffix,StringComparison.OrdinalIgnoreCase);
    }
    internal static bool SupportedName(string name){
      return !String.IsNullOrEmpty(name) && !name.StartsWith("~$") &&
        (IsReport(name) || name.EndsWith(".csv",StringComparison.OrdinalIgnoreCase) || name.EndsWith(".tsv",StringComparison.OrdinalIgnoreCase) || name.EndsWith(".xlsx",StringComparison.OrdinalIgnoreCase));
    }
    static bool Allowed(FileInfo f){
      return SupportedName(f.Name) && (f.Attributes & (FileAttributes.Hidden|FileAttributes.System|FileAttributes.ReparsePoint))==0;
    }
    FileInfo InventoryItem(string name,bool report){
      if(String.IsNullOrWhiteSpace(name) || name.IndexOfAny(Path.GetInvalidFileNameChars())>=0 || name!=Path.GetFileName(name) || name.TrimEnd(' ','.')!=name)
        throw new DesktopError("Invalid file name.","文件名无效。");
      var file=new FileInfo(Path.Combine(Folder,name));
      if(!file.Exists || !Allowed(file) || IsReport(name)!=report)
        throw new DesktopError("File moved or unsupported. Refresh the inventory.","文件已移动或格式不受支持，请刷新。");
      return file;
    }
    internal string InventoryReport(string name){return InventoryItem(name,true).FullName;}
    internal object Inventory() {
      return new {folder=Folder,isExamples=String.Equals(Folder,Examples,StringComparison.OrdinalIgnoreCase),files=new DirectoryInfo(Folder).EnumerateFiles().Where(Allowed)
        .OrderByDescending(f=>f.LastWriteTimeUtc).ThenBy(f=>f.Name,StringComparer.OrdinalIgnoreCase)
        .Select(f=>new {name=f.Name,kind=IsReport(f.Name)?"report":"data",size=f.Length,modified=f.LastWriteTimeUtc.ToString("o")}).ToArray()};
    }
    internal object Load(string name,string role) {
      if(role!="main" && role!="settlement" && role!="bank")throw new InvalidDataException();
      var file=InventoryItem(name,false);
      byte[] input;
      using(var s=new FileStream(file.FullName,FileMode.Open,FileAccess.Read,FileShare.Read)){
        if(s.Length>MaxInput)throw new DesktopError("The file exceeds the 5 MiB limit.","文件超过 5 MiB 上限。");
        using(var m=new MemoryStream()){s.CopyTo(m);input=m.ToArray();}
      }
      return Register(name,input,role);
    }
    internal object Material(string name,byte[] supplied=null){
      if(String.IsNullOrWhiteSpace(name)||name.IndexOfAny(Path.GetInvalidFileNameChars())>=0||name!=Path.GetFileName(name)||!SupportedName(name))throw new DesktopError("Use CSV, XLSX or a marked One Page BI report.","请使用 CSV、XLSX 或有标记的 One Page BI 报表。");
      int cap=IsReport(name)?16*1024*1024:MaxInput;
      byte[] input=supplied;
      if(input==null){
        var f=InventoryItem(name,IsReport(name));
        using(var stream=new FileStream(f.FullName,FileMode.Open,FileAccess.Read,FileShare.Read)){
          if(stream.Length>cap)throw new DesktopError("This material exceeds the file size limit.","材料超过文件大小上限。");
          using(var memory=new MemoryStream()){stream.CopyTo(memory);input=memory.ToArray();}
        }
      }
      if(input.Length>cap)throw new DesktopError("This material exceeds the file size limit.","材料超过文件大小上限。");
      return Register(name,input,"pool");
    }
    object Register(string name,byte[] input,string role){
      if(name.EndsWith(".xlsx",StringComparison.OrdinalIgnoreCase)){
        using(var zip=new ZipArchive(new MemoryStream(input),ZipArchiveMode.Read)){
          if(zip.Entries.Count>2000 || zip.Entries.Sum(e=>e.Length)>32*1024*1024L || zip.GetEntry("xl/workbook.xml")==null)
            throw new DesktopError("Unsupported workbook or above the unpacked limit of 32 MiB or 2,000 entries.","不支持该工作簿结构，或解压后超过 32 MiB / 2,000 项。");
        }
      }
      var copy=new InputCopy{Name=name,Role=role,Bytes=input,Token=Guid.NewGuid().ToString("N")};
      using(var sha=SHA256.Create()) copy.Hash=BitConverter.ToString(sha.ComputeHash(input)).Replace("-","").ToLowerInvariant();
      if(role=="pool"){
        var existing=pool.Values.FirstOrDefault(c=>c.Hash==copy.Hash);
        if(existing!=null)return new {name=existing.Name,token=existing.Token,sha256=existing.Hash,bytes="",duplicate=true};
        if(pool.Count>=9)throw new DesktopError("All nine slots are occupied. Remove a material first.","九个材料格都已占用，请先移出一份材料。");
        pool.Add(copy.Token,copy);
      }else snapshots[role]=copy;
      return new {name=name,token=copy.Token,sha256=copy.Hash,bytes=Convert.ToBase64String(input)};
    }
    internal void StartPool(){pool.Clear();}
    internal void RemoveMaterial(string token){pool.Remove(token);}
    InputCopy Bound(string token,string role){
      InputCopy src;if(!pool.TryGetValue(token,out src))throw new DesktopError("Material removed. Choose the report again.","材料已移出，请重新选择报表。");
      return new InputCopy{Role=role,Name=src.Name,Token=token,Bytes=src.Bytes,Hash=src.Hash};
    }
    InputCopy RequireCopy(string role,string token){
      InputCopy copy;
      if(!snapshots.TryGetValue(role,out copy) || copy.Token!=token)throw new DesktopError("The input changed. Reload it and check the mapping again.","数据快照已更换，请重新载入并确认字段。");
      return copy;
    }
    internal string Archive(Dictionary<string,object> d) {
      string recipe=(string)d["recipe"];
      InputCopy[] copies;
      if(d.ContainsKey("materialToken")){
        var firstToken=(string)d["materialToken"];
        if(d.ContainsKey("periodTokens")){
          var tokens=((string)d["periodTokens"]).Split(',');
          if(tokens.Length<2 || tokens.Length>9 || (recipe!="sales" && recipe!="orders"))throw new InvalidDataException();
          copies=tokens.Select((token,i)=>Bound(token,"period-"+(i+1).ToString("00"))).ToArray();
        }else if(recipe=="payout") copies=new[]{Bound(firstToken,"settlement"),Bound((string)d["secondToken"],"bank")};
        else if(d.ContainsKey("secondToken")) copies=new[]{Bound(firstToken,"lines"),Bound((string)d["secondToken"],"headers")};
        else copies=new[]{Bound(firstToken,"main")};
      }else copies=recipe=="payout"?new[]{RequireCopy("settlement",(string)d["token"]),RequireCopy("bank",(string)d["bankToken"])}:new[]{RequireCopy("main",(string)d["token"])};
      var first=copies[0];
      Directory.CreateDirectory(Reports);
      string id=Guid.NewGuid().ToString("N"), stage=Path.Combine(Reports,".partial-"+id), dest=Path.Combine(Reports,id);
      Directory.CreateDirectory(stage);
      try{
        foreach(string sub in new[]{"inputs","data","dashboard","exports"}) Directory.CreateDirectory(Path.Combine(stage,sub));
        foreach(var copy in copies){
          var dir=Path.Combine(stage,"inputs",copy.Role=="main"?"":copy.Role);
          Directory.CreateDirectory(dir);
          File.WriteAllBytes(Path.Combine(dir,copy.Name),copy.Bytes);
        }
        File.WriteAllText(Path.Combine(stage,"data","processed.json"),(string)d["processed"],Utf8);
        File.WriteAllText(Path.Combine(stage,"dashboard","report.html"),(string)d["html"],Utf8);
        File.WriteAllText(Path.Combine(stage,"template.json"),(string)d["template"],Utf8);
        byte[] png=ReadPng((string)d["png"]);
        File.WriteAllBytes(Path.Combine(stage,"exports","report.png"),png);
        var meta=new {id=id,created=(string)d["created"],source=first.Name,sha256=first.Hash,sources=copies.Select(c=>new {role=c.Role,name=c.Name,sha256=c.Hash}).ToArray(),rows=Convert.ToInt32(d["rows"]),sheet=(string)d["sheet"],recipe=recipe,appVersion="0.4.0",language=Language,schemaVersion=1};
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
    internal object PutOnDesktop(string id){
      string html=ItemPath(id,@"dashboard\report.html");
      var meta=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(ItemPath(id,"metadata.json")));
      string recipe=Convert.ToString(meta.ContainsKey("recipe")?meta["recipe"]:"sales");
      if(recipe!="sales" && recipe!="orders" && recipe!="cashflow" && recipe!="payout") throw new DesktopError("Unknown recipe.","无法识别配方。");
      string source=Path.GetFileNameWithoutExtension((string)meta["source"]);
      string shortName=new string(source.Where(c=>Array.IndexOf(Path.GetInvalidFileNameChars(),c)<0).Take(42).ToArray()).TrimEnd(' ','.');
      if(shortName.Length>0 && Char.IsHighSurrogate(shortName[shortName.Length-1]))shortName=shortName.Substring(0,shortName.Length-1);
      string stem="BI-"+recipe+"-"+shortName+"-"+id.Substring(0,8);
      string staged=Path.Combine(Desktop,".onepagebi-"+Guid.NewGuid().ToString("N")+".tmp");
      try {
        File.Copy(html,staged);
        byte[] digest;
        using(var hash=SHA256.Create())using(var input=File.OpenRead(staged))digest=hash.ComputeHash(input);
        long length=new FileInfo(staged).Length;
        for(int i=1;i<=1000;i++){
          string name=stem+(i==1?"":" ("+i+")")+ReportSuffix;
          string target=Path.Combine(Desktop,name);
          try { File.Move(staged,target); }
          catch(IOException){
            if(Directory.Exists(target))continue;
            var existing=new FileInfo(target);
            if(!existing.Exists)throw;
            if(!Allowed(existing) || existing.Length!=length)continue;
            using(var hash=SHA256.Create())using(var input=File.OpenRead(target))
              if(!hash.ComputeHash(input).SequenceEqual(digest))continue;
          }
          Folder=Desktop;
          return new {name=name,inventory=Inventory()};
        }
        throw new DesktopError("Too many files share this report name.","同名报表过多，请整理后重试。");
      } finally {if(File.Exists(staged))File.Delete(staged);}
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

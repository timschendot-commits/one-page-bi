using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace OnePageBI {
  internal sealed class Workbench : Form {
    const string StartUrl="https://onepagebi.local/index.html";
    readonly WebView2 view=new WebView2();
    readonly Store store;
    readonly FileSystemWatcher inventoryWatch=new FileSystemWatcher();
    readonly Timer refreshTimer=new Timer {Interval=180};
    readonly string profile;
    readonly string install=AppDomain.CurrentDomain.BaseDirectory;
    internal Workbench(string alternate){
      store=new Store(alternate);
      profile=Path.Combine(alternate??Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"One Page BI"),"WebView2");
      Text="One Page BI";
      inventoryWatch.SynchronizingObject=this;
      inventoryWatch.NotifyFilter=NotifyFilters.FileName|NotifyFilters.LastWrite|NotifyFilters.Attributes;
      inventoryWatch.Changed+=OnFileChange;
      inventoryWatch.Created+=OnFileChange;
      inventoryWatch.Deleted+=OnFileChange;
      inventoryWatch.Renamed+=(s,e)=>{if(Store.SupportedName(e.OldName)||Store.SupportedName(e.Name))ScheduleRefresh();};
      inventoryWatch.Error+=(s,e)=>ScheduleRefresh();
      refreshTimer.Tick+=(s,e)=>{
        refreshTimer.Stop();
        try{view.CoreWebView2.PostWebMessageAsJson(store.Json.Serialize(new {kind="inventoryChanged",inventory=store.Inventory()}));}
        catch(IOException){} catch(UnauthorizedAccessException){}
      };
      FormClosed+=(s,e)=>{inventoryWatch.Dispose();refreshTimer.Dispose();};
      using(var graphics=CreateGraphics()){
        float scale=graphics.DpiX/96f;
        var area=Screen.FromControl(this).WorkingArea;
        Size=new Size(Math.Min(area.Width,(int)(1390*scale)),Math.Min(area.Height,(int)(920*scale)));
        MinimumSize=new Size(Math.Min(area.Width,(int)(730*scale)),Math.Min(area.Height,(int)(560*scale)));
      }
      StartPosition=FormStartPosition.CenterScreen;Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);view.Dock=DockStyle.Fill;Controls.Add(view);
      Shown+=async (sender,e)=>{try{await Start();}catch(Exception ex){MessageBox.Show("Unable to start One Page BI. Check the Microsoft Edge WebView2 Runtime.\n"+ex.Message,Text);Close();}};
    }
    void ScheduleRefresh(){refreshTimer.Stop();refreshTimer.Start();}
    void OnFileChange(object sender,FileSystemEventArgs e){if(Store.SupportedName(e.Name))ScheduleRefresh();}
    void WatchFolder(){
      if(inventoryWatch.EnableRaisingEvents && inventoryWatch.Path==store.Folder)return;
      inventoryWatch.EnableRaisingEvents=false;
      try{inventoryWatch.Path=store.Folder;inventoryWatch.EnableRaisingEvents=true;}
      catch(IOException){} catch(UnauthorizedAccessException){} catch(ArgumentException){}
    }
    async Task Start(){
      var env=await CoreWebView2Environment.CreateAsync(null,profile,null);
      await view.EnsureCoreWebView2Async(env);
      var core=view.CoreWebView2;
      core.SetVirtualHostNameToFolderMapping("onepagebi.local",Path.Combine(install,"ui"),CoreWebView2HostResourceAccessKind.Deny);
      core.Settings.AreHostObjectsAllowed=false;
      core.Settings.AreDefaultContextMenusEnabled=false;
      core.Settings.IsStatusBarEnabled=false;
      core.NewWindowRequested+=(s,e)=>{e.Handled=true;};
      core.NavigationStarting+=(s,e)=>{if(e.Uri!=StartUrl)e.Cancel=true;};
      core.WebMessageReceived+=(s,e)=>{
        if(e.Source!=StartUrl)return;
        string message=e.WebMessageAsJson;
        // Native pickers run a message loop. Leave the WebView2 callback first.
        BeginInvoke(new Action(()=>Reply(core,message)));
      };
      core.Navigate(StartUrl);
    }
    void Reply(CoreWebView2 core,string message){
      string id="";
      try{
        var d=store.Json.Deserialize<Dictionary<string,object>>(message);
        id=(string)d["id"];
        store.SetLanguage(d.ContainsKey("language")?(string)d["language"]:"en");
        System.Threading.Thread.CurrentThread.CurrentUICulture=System.Globalization.CultureInfo.GetCultureInfo(store.Language);
        Text="One Page BI · "+L("Report workbench","报表合成台");
        object result=Dispatch((string)d["method"],d);
        WatchFolder();
        core.PostWebMessageAsJson(store.Json.Serialize(new {id=id,ok=true,result=result}));
      }catch(Exception ex){
        var known=ex as DesktopError;
        string code=" (0x"+ex.HResult.ToString("X8")+")";
        string en=known!=null?known.Message:"The operation failed. Check the file location and permissions, then try again."+code;
        string zh=known!=null?known.Chinese:"操作失败，请检查文件位置和访问权限后重试。"+code;
        core.PostWebMessageAsJson(store.Json.Serialize(new {id=id,ok=false,error=en,chinese=zh}));
      }
    }
    string L(string en,string zh){return store.Language=="zh-CN"?zh:en;}
    object Dispatch(string method,Dictionary<string,object> d){
      string role=d.ContainsKey("role")?(string)d["role"]:"main";
      switch(method){
        case "startPool":store.StartPool();return true;
        case "materialLoad":return store.Material((string)d["name"]);
        case "materialDrop":return store.Material((string)d["name"],Convert.FromBase64String((string)d["bytes"]));
        case "materialRemove":store.RemoveMaterial((string)d["token"]);return true;
        case "inventory": return store.Inventory();
        case "desktop": store.Folder=store.Desktop;return store.Inventory();
        case "examples": store.Folder=store.Examples;return store.Inventory();
        case "folder":
          using(var dlg=new FolderBrowserDialog {Description=L("Choose an inventory folder","选择背包文件夹"),SelectedPath=store.Folder,ShowNewFolderButton=false}){
            if(dlg.ShowDialog(this)==DialogResult.OK)store.Folder=dlg.SelectedPath;
          }return store.Inventory();
        case "selectFile":
          using(var dlg=new OpenFileDialog {Title=L("Choose data file","选择数据文件"),Filter=L("Data files","数据文件")+" (*.csv;*.xlsx)|*.csv;*.xlsx",InitialDirectory=store.Folder}){
            if(dlg.ShowDialog(this)!=DialogResult.OK)return null;
            store.Folder=Path.GetDirectoryName(dlg.FileName);return store.Load(Path.GetFileName(dlg.FileName),role);
          }
        case "load":return store.Load((string)d["name"],role);
        case "putOnDesktop":return store.PutOnDesktop((string)d["archiveId"]);
        case "inventoryReport":Open(store.InventoryReport((string)d["name"]));return true;
        case "archive":return store.Archive(d);
        case "history":return store.History();
        case "report":Open(store.ItemPath((string)d["archiveId"],@"dashboard\report.html"));return true;
        case "archiveFolder":Open(store.ItemPath((string)d["archiveId"],""));return true;
        case "exportPng":
          var png=store.ItemPath((string)d["archiveId"],@"exports\report.png");
          using(var dlg=new SaveFileDialog {Title=L("Export PNG","导出 PNG"),Filter=L("PNG image","PNG 图像")+"|*.png",FileName=L("OnePageBI-report.png","一页报表.png"),DefaultExt="png",AddExtension=true}){
            if(dlg.ShowDialog(this)!=DialogResult.OK)return false;
            string target=Path.GetFullPath(dlg.FileName);
            if(!d.ContainsKey("png") && String.Equals(target,Path.GetFullPath(png),StringComparison.OrdinalIgnoreCase))return true;
            if(!Path.GetExtension(target).Equals(".png",StringComparison.OrdinalIgnoreCase))throw new DesktopError("Use a .png extension.","请使用 .png 扩展名。");
            if(target.StartsWith(Path.GetFullPath(store.Reports)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new DesktopError("Choose a location outside the archive to preserve the original files.","请选择档案库以外的位置，以保留历史原件。");
            if(d.ContainsKey("png"))File.WriteAllBytes(target,Store.ReadPng((string)d["png"]));
            else File.Copy(png,target,true);
          }return true;
        default:throw new DesktopError("Unknown operation.","未知操作。");
      }
    }
    static void Open(string path){
      if(!Directory.Exists(path) && !File.Exists(path))throw new DesktopError("File or folder not found.","文件或文件夹不存在。");
      Process.Start(new ProcessStartInfo(path){UseShellExecute=true});
    }
    [STAThread] static void Main(string[] args){
      Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
      string profile=args.Length==2 && args[0]=="--profile"?Path.GetFullPath(args[1]):null;
      Application.Run(new Workbench(profile));
    }
  }
}


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
    readonly string profile;
    readonly string install=AppDomain.CurrentDomain.BaseDirectory;
    internal Workbench(string alternate){
      store=new Store(alternate);
      profile=Path.Combine(alternate??Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"One Page BI"),"WebView2");
      Text="One Page BI   ·   报表合成台";Size=new Size(1390,920);MinimumSize=new Size(820,600);
      StartPosition=FormStartPosition.CenterScreen;Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);view.Dock=DockStyle.Fill;Controls.Add(view);
      Shown+=async (sender,e)=>{try{await Start();}catch(Exception ex){MessageBox.Show("启动失败，请检查 Microsoft Edge WebView2 Runtime。\n"+ex.Message,Text);Close();}};
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
        string id="";
        try{
          var d=store.Json.Deserialize<Dictionary<string,object>>(e.WebMessageAsJson);
          id=(string)d["id"];
          object result=Dispatch((string)d["method"],d);
          core.PostWebMessageAsJson(store.Json.Serialize(new {id=id,ok=true,result=result}));
        }catch(Exception ex){core.PostWebMessageAsJson(store.Json.Serialize(new {id=id,ok=false,error=ex.Message}));}
      };
      core.Navigate(StartUrl);
    }
    object Dispatch(string method,Dictionary<string,object> d){
      switch(method){
        case "inventory": return store.Inventory();
        case "desktop": store.Folder=store.Desktop;return store.Inventory();
        case "examples": store.Folder=Path.Combine(install,"examples");return store.Inventory();
        case "folder":
          using(var dlg=new FolderBrowserDialog {Description="选择 Inventory 文件夹",SelectedPath=store.Folder,ShowNewFolderButton=false}){
            if(dlg.ShowDialog(this)==DialogResult.OK)store.Folder=dlg.SelectedPath;
          }return store.Inventory();
        case "selectFile":
          using(var dlg=new OpenFileDialog {Title="选择销售明细",Filter="销售数据 (*.csv;*.xlsx)|*.csv;*.xlsx",InitialDirectory=store.Folder}){
            if(dlg.ShowDialog(this)!=DialogResult.OK)return null;
            store.Folder=Path.GetDirectoryName(dlg.FileName);return store.Load(Path.GetFileName(dlg.FileName));
          }
        case "load":return store.Load((string)d["name"]);
        case "archive":return store.Archive(d);
        case "history":return store.History();
        case "report":Open(store.ItemPath((string)d["archiveId"],@"dashboard\report.html"));return true;
        case "archiveFolder":Open(store.ItemPath((string)d["archiveId"],""));return true;
        case "exportPng":
          var png=store.ItemPath((string)d["archiveId"],@"exports\report.png");
          using(var dlg=new SaveFileDialog {Filter="PNG 图像|*.png",FileName="销售分析.png",DefaultExt="png",AddExtension=true}){
            if(dlg.ShowDialog(this)!=DialogResult.OK)return false;
            if(!String.Equals(Path.GetFullPath(dlg.FileName),Path.GetFullPath(png),StringComparison.OrdinalIgnoreCase)) File.Copy(png,dlg.FileName,true);
          }return true;
        default:throw new InvalidOperationException("未知操作。");
      }
    }
    static void Open(string path){
      if(!Directory.Exists(path) && !File.Exists(path))throw new IOException("文件或文件夹不存在。");
      Process.Start(new ProcessStartInfo(path){UseShellExecute=true});
    }
    [STAThread] static void Main(string[] args){
      Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
      string profile=args.Length==2 && args[0]=="--profile"?Path.GetFullPath(args[1]):null;
      Application.Run(new Workbench(profile));
    }
  }
}


using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
namespace OnePageBI {
 internal sealed partial class Workbench {
  NotifyIcon tray;
  Rectangle fullBounds;
  bool floating;
  [DllImport("user32.dll")] static extern bool ReleaseCapture();
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h,int msg,IntPtr w,IntPtr l);
  int Dp(int n){using(var g=CreateGraphics())return (int)Math.Round(n*g.DpiX/96.0);}
  void ConfigureShell(){
   FormBorderStyle=FormBorderStyle.None;Padding=new Padding(Dp(4));BackColor=Color.FromArgb(47,66,55);MinimumSize=new Size(Dp(314),Dp(250));
   tray=new NotifyIcon{Icon=Icon,Text="One Page BI",Visible=true};var menu=new ContextMenuStrip();
   menu.Opening+=(s,e)=>{menu.Items.Clear();menu.Items.Add(L("Open workbench","打开工作台"),null,(a,b)=>SetMode(false));menu.Items.Add(L("Floating window","悬浮小窗"),null,(a,b)=>SetMode(true));var pin=menu.Items.Add(L("Keep on top","置顶"),null,(a,b)=>TopMost=!TopMost) as ToolStripMenuItem;pin.Checked=TopMost;menu.Items.Add(new ToolStripSeparator());menu.Items.Add(L("Exit","退出"),null,(a,b)=>Close());};
   tray.ContextMenuStrip=menu;tray.DoubleClick+=(s,e)=>RestoreWindow();
   FormClosed+=(s,e)=>{tray.Visible=false;tray.Dispose();menu.Dispose();};
  }
  void RestoreWindow(){Show();ShowInTaskbar=true;if(WindowState==FormWindowState.Minimized)WindowState=FormWindowState.Normal;Activate();}
  void SetMode(bool small){RestoreWindow();var area=Screen.FromControl(this).WorkingArea;
   if(small){if(!floating)fullBounds=WindowState==FormWindowState.Normal?Bounds:RestoreBounds;WindowState=FormWindowState.Normal;int w=Math.Min(Dp(388),area.Width),h=Math.Min(Dp(450),area.Height);Bounds=new Rectangle(area.Right-w,area.Bottom-h,w,h);}
   else if(floating){WindowState=FormWindowState.Normal;var w=Math.Min(fullBounds.Width>0?fullBounds.Width:Dp(1180),area.Width);var h=Math.Min(fullBounds.Height>0?fullBounds.Height:Dp(800),area.Height);Bounds=new Rectangle(Math.Max(area.X,Math.Min(fullBounds.X,area.Right-w)),Math.Max(area.Y,Math.Min(fullBounds.Y,area.Bottom-h)),w,h);}
   floating=small;
  }
  object WindowAction(string action){
   switch(action){
   case "compact":SetMode(true);break;
   case "full":if(!floating&&ClientSize.Width<Dp(660)){floating=true;fullBounds=Rectangle.Empty;}SetMode(false);break;
   case "pin":TopMost=!TopMost;break;
   case "tray":ShowInTaskbar=false;Hide();break;
   case "restore":RestoreWindow();break;
   case "maximize":if(WindowState==FormWindowState.Maximized)WindowState=FormWindowState.Normal;else {MaximizedBounds=Screen.FromControl(this).WorkingArea;WindowState=FormWindowState.Maximized;}break;
   case "minimize":WindowState=FormWindowState.Minimized;break;
   case "close":BeginInvoke(new Action(Close));break;
   case "drag":ReleaseCapture();SendMessage(Handle,0x00A1,(IntPtr)2,IntPtr.Zero);break;
   case "state":break;
   default:throw new InvalidOperationException();}
   return new {visible=Visible,pinned=TopMost,width=ClientSize.Width,height=ClientSize.Height,compact=floating};
  }
  protected override void WndProc(ref Message m){
   if(m.Msg==0x84 && WindowState==FormWindowState.Normal){var p=PointToClient(Cursor.Position);int b=Math.Max(Padding.Left,3);bool l=p.X<b,r=p.X>=ClientSize.Width-b,t=p.Y<b,d=p.Y>=ClientSize.Height-b;int hit=t?(l?13:r?14:12):d?(l?16:r?17:15):l?10:r?11:0;if(hit!=0){m.Result=(IntPtr)hit;return;}}
   base.WndProc(ref m);
  }
 }
}

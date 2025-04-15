type Instance = {
    InstanceID: string;
    TargetID: string;
    InstanceName: string;
    FriendlyName: string;
    WelcomeMessage: string;
    Description: string;
    Module: string;
    ModuleDisplayName: string;
    AMPVersion: string;
    IsHTTPS: boolean;
    IP: string;
    Port: number;
    Daemon: boolean;
    DaemonAutostart: boolean;
    ExcludeFromFirewall: boolean;
    UseHostModeNetwork: boolean;
    Running: boolean;
    AppState: number;
    Tags: string[];
    DiskUsageMB: number;
    Group: string;
    Order: number;
    ReleaseStream: number;
    ManagementMode: number;
    Suspended: boolean;
    IsContainerInstance: boolean;
    ContainerMemoryMB: number;
    ContainerSwapMB: number;
    ContainerMemoryPolicy: number;
    ContainerCPUs: number;
    SpecificDockerImage: string;
    Metrics: {
        'CPU Usage': {
            RawValue: number;
            MaxValue: number;
            Percent: number;
            Units: string;
            Color: string;
            Color2: string;
            Color3: string;
            ShortName: string;
        };
        'Memory Usage': {
            RawValue: number;
            MaxValue: number;
            Percent: number;
            Units: string;
            Color: string;
            Color2: string;
            Color3: string;
            ShortName: string;
        }
        'Active Users': {
            RawValue: number;
            MaxValue: number;
            Percent: number;
            Units: string;
            Color: string;
            Color2: string;
            Color3: string;
            ShortName: string;
        };
        TPS:{
            RawValue: number;
            MaxValue: number;
            Percent: number;
            Units: string;
            Color: string;
            Color2: string;
            Color3: string;
            ShortName: string;
        }
    };
    ApplicationEndpoints: Object[];
    DeploymentEndpoints: {
        'FileManagerPlugin.SFTP.SFTPIPBinding': string;
        'MinecraftModule.Minecraft.ServerIPBinding': string;
        'FileManagerPlugin.SFTP.SFTPPortNumber': string;
        'MinecraftModule.Minecraft.PortNumber': string;
        'Core.Monitoring.MonitorPorts': string;
    };
    CustomMountBinds: {};
    ExtraContainerPackages: string[];
    DisplayImageSource: string;
};

export default Instance;
